import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Transfer, TransferStatus } from '@database/entities/transfer.entity';
import { Contact } from '@database/entities/contact.entity';
import { User } from '@database/entities/user.entity';
import { MSG } from '@common/constants/messages';
import { UserService } from '../user/user.service';
import { WalletService } from '../wallet/wallet.service';
import { PaginationQueryDto, PaginatedResponse } from '@common/dto/api-response.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { AddContactDto } from './dto/contact.dto';

@Injectable()
export class TransferService {
  constructor(
    @InjectRepository(Transfer)
    private transferRepository: Repository<Transfer>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private userService: UserService,
    private walletService: WalletService,
  ) {}

  async getContacts(userId: string, keyword?: string) {
    const queryBuilder = this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.contactUser', 'contactUser')
      .where('contact.userId = :userId', { userId });

    if (keyword) {
      queryBuilder.andWhere(
        '(contact.remark LIKE :keyword OR contactUser.username LIKE :keyword OR contactUser.nickname LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    const contacts = await queryBuilder
      .orderBy('contact.createdAt', 'DESC')
      .getMany();

    return contacts.map((c) => ({
      id: c.id,
      userId: c.contactUserId,
      username: c.contactUser?.username,
      nickname: c.contactUser?.nickname,
      avatar: c.contactUser?.avatar,
      remark: c.remark,
      createdAt: c.createdAt,
    }));
  }

  async addContact(userId: string, dto: AddContactDto) {
    // Check if contact user exists
    const contactUser = await this.userRepository.findOne({
      where: { id: dto.contactUserId },
    });

    if (!contactUser) {
      throw new NotFoundException(MSG.TRANSFER_USER_NOT_FOUND);
    }

    // Cannot add self as contact
    if (userId === dto.contactUserId) {
      throw new BadRequestException(MSG.TRANSFER_SELF_NOT_ALLOWED);
    }

    // Check if already a contact
    const existing = await this.contactRepository.findOne({
      where: { userId, contactUserId: dto.contactUserId },
    });

    if (existing) {
      throw new BadRequestException(MSG.CONTACT_ALREADY_EXISTS); // Contact already exists
    }

    const contact = this.contactRepository.create({
      userId,
      contactUserId: dto.contactUserId,
      remark: dto.remark,
    });

    const saved = await this.contactRepository.save(contact);

    return {
      id: saved.id,
      userId: contactUser.id,
      username: contactUser.username,
      nickname: contactUser.nickname,
      avatar: contactUser.avatar,
      remark: saved.remark,
      createdAt: saved.createdAt,
    };
  }

  async updateContact(userId: string, contactId: string, remark: string) {
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, userId },
      relations: ['contactUser'],
    });

    if (!contact) {
      throw new NotFoundException(MSG.CONTACT_NOT_FOUND); // Contact not found
    }

    contact.remark = remark;
    await this.contactRepository.save(contact);

    return {
      id: contact.id,
      userId: contact.contactUserId,
      username: contact.contactUser?.username,
      nickname: contact.contactUser?.nickname,
      avatar: contact.contactUser?.avatar,
      remark: contact.remark,
      createdAt: contact.createdAt,
    };
  }

  async deleteContact(userId: string, contactId: string) {
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, userId },
    });

    if (!contact) {
      throw new NotFoundException(MSG.CONTACT_NOT_FOUND); // Contact not found
    }

    await this.contactRepository.remove(contact);

    return { success: true };
  }

  async getContactRecords(userId: string, contactId: string, query: PaginationQueryDto) {
    // Get contact to find the contact user ID
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, userId },
    });

    if (!contact) {
      throw new NotFoundException(MSG.CONTACT_NOT_FOUND); // Contact not found
    }

    const contactUserId = contact.contactUserId;
    const { page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    // Find transfers between current user and contact user
    const [items, total] = await this.transferRepository.findAndCount({
      where: [
        { fromUserId: userId, toUserId: contactUserId },
        { fromUserId: contactUserId, toUserId: userId },
      ],
      relations: ['fromUser', 'toUser'],
      skip,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    const records = items.map((t) => ({
      id: t.id,
      type: t.fromUserId === userId ? 'out' : 'in',
      amount: t.amount,
      remark: t.remark,
      status: t.status,
      createdAt: t.createdAt,
    }));

    return new PaginatedResponse(records, total, page, pageSize);
  }

  async searchUser(keyword: string) {
    // Search by username (MuPay ID) or email
    const users = await this.userRepository.find({
      where: [
        { username: Like(`%${keyword}%`) },
        { email: Like(`%${keyword}%`) },
      ],
      select: ['id', 'username', 'email', 'nickname', 'avatar'],
      take: 10,
    });

    return users;
  }

  async createTransfer(fromUserId: string, dto: CreateTransferDto) {
    // Verify payment password
    await this.userService.verifyPaymentPassword(fromUserId, dto.paymentPassword);

    // Check if target user exists
    const toUser = await this.userRepository.findOne({
      where: { id: dto.toUserId },
    });

    if (!toUser) {
      throw new NotFoundException(MSG.TRANSFER_USER_NOT_FOUND);
    }

    if (fromUserId === dto.toUserId) {
      throw new BadRequestException(MSG.TRANSFER_SELF_NOT_ALLOWED);
    }

    // Check balance
    const wallet = await this.walletService.getWalletByUserId(fromUserId);
    if (Number(wallet.balance) < dto.amount) {
      throw new BadRequestException(MSG.WALLET_BALANCE_INSUFFICIENT);
    }

    // Create transfer record
    const transfer = this.transferRepository.create({
      fromUserId,
      toUserId: dto.toUserId,
      amount: dto.amount,
      remark: dto.remark,
      status: TransferStatus.COMPLETED,
      completedAt: new Date(),
    });

    // Deduct from sender
    await this.walletService.updateBalance(fromUserId, -dto.amount);

    // Add to receiver
    await this.walletService.updateBalance(dto.toUserId, dto.amount);

    await this.transferRepository.save(transfer);

    // Add to contacts if not exists
    const existingContact = await this.contactRepository.findOne({
      where: { userId: fromUserId, contactUserId: dto.toUserId },
    });

    if (!existingContact) {
      const contact = this.contactRepository.create({
        userId: fromUserId,
        contactUserId: dto.toUserId,
      });
      await this.contactRepository.save(contact);
    }

    return {
      messageId: MSG.TRANSFER_SUCCESS,
      transferId: transfer.id,
      amount: dto.amount,
      toUser: {
        id: toUser.id,
        username: toUser.username,
        nickname: toUser.nickname,
      },
    };
  }

  async getRecords(userId: string, query: PaginationQueryDto) {
    const { page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const [items, total] = await this.transferRepository.findAndCount({
      where: [{ fromUserId: userId }, { toUserId: userId }],
      relations: ['fromUser', 'toUser'],
      skip,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    const records = items.map((t) => ({
      id: t.id,
      type: t.fromUserId === userId ? 'out' : 'in',
      amount: t.amount,
      remark: t.remark,
      status: t.status,
      createdAt: t.createdAt,
      counterparty: t.fromUserId === userId
        ? { id: t.toUser?.id, username: t.toUser?.username, nickname: t.toUser?.nickname }
        : { id: t.fromUser?.id, username: t.fromUser?.username, nickname: t.fromUser?.nickname },
    }));

    return new PaginatedResponse(records, total, page, pageSize);
  }
}
