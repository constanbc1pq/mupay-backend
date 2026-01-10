import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser } from '@database/entities/admin-user.entity';
import { User } from '@database/entities/user.entity';
import { Transaction } from '@database/entities/transaction.entity';
import { Agent } from '@database/entities/agent.entity';
import { Wallet } from '@database/entities/wallet.entity';
import { Card } from '@database/entities/card.entity';
import { Cardholder } from '@database/entities/cardholder.entity';
import { KycRecord } from '@database/entities/kyc-record.entity';
import { MSG } from '@common/constants/messages';
import { AdminLoginDto } from './dto/admin-login.dto';
import { PaginationQueryDto, PaginatedResponse } from '@common/dto/api-response.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminUser)
    private adminUserRepository: Repository<AdminUser>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Card)
    private cardRepository: Repository<Card>,
    @InjectRepository(Cardholder)
    private cardholderRepository: Repository<Cardholder>,
    @InjectRepository(KycRecord)
    private kycRecordRepository: Repository<KycRecord>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: AdminLoginDto) {
    const { username, password } = loginDto;

    const admin = await this.adminUserRepository.findOne({
      where: { username },
    });

    if (!admin) {
      throw new UnauthorizedException(MSG.ADMIN_INVALID_CREDENTIALS);
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(MSG.ADMIN_INVALID_CREDENTIALS);
    }

    if (admin.status !== 'active') {
      throw new UnauthorizedException(MSG.AUTH_USER_DISABLED);
    }

    // Update last login time
    admin.lastLoginAt = new Date();
    await this.adminUserRepository.save(admin);

    const payload = { sub: admin.id, username: admin.username, role: admin.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
    };
  }

  async getUsers(query: PaginationQueryDto) {
    const { page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const [items, total] = await this.userRepository.findAndCount({
      select: ['id', 'username', 'phone', 'email', 'nickname', 'kycLevel', 'isAgent', 'status', 'createdAt'],
      skip,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return new PaginatedResponse(items, total, page, pageSize);
  }

  async getUserDetail(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'username', 'phone', 'email', 'nickname', 'avatar', 'kycLevel', 'isAgent', 'status', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      throw new NotFoundException(MSG.ADMIN_USER_NOT_FOUND);
    }

    // Get wallet balance
    const wallet = await this.walletRepository.findOne({ where: { userId: id } });
    const walletBalance = wallet ? Number(wallet.balance) : 0;

    // Get KYC status
    const kycRecord = await this.kycRecordRepository.findOne({
      where: { userId: id },
      order: { createdAt: 'DESC' },
    });
    const kycStatus = kycRecord?.status || null;

    // Get user's cards
    const cards = await this.cardRepository.find({
      where: { userId: id },
      select: ['id', 'cardNumberLast4', 'cardNumber', 'status'],
      order: { createdAt: 'DESC' },
    });

    // Get user's cardholders
    const cardholders = await this.cardholderRepository.find({
      where: { userId: id },
      select: ['id', 'providerCardholderId', 'firstName', 'lastName', 'email', 'phone', 'country', 'status', 'createdAt', 'updatedAt'],
      order: { createdAt: 'DESC' },
    });

    return {
      ...user,
      walletBalance,
      kycStatus,
      cards: cards.map(card => ({
        id: card.id,
        cardNumber: card.cardNumberLast4 ? `****${card.cardNumberLast4}` : card.cardNumber,
        status: card.status,
      })),
      cardholders: cardholders.map(ch => ({
        id: ch.id,
        odooId: ch.providerCardholderId,
        firstName: ch.firstName,
        lastName: ch.lastName,
        email: ch.email,
        phone: ch.phone,
        countryCode: ch.country,
        status: ch.status,
        createdAt: ch.createdAt,
        updatedAt: ch.updatedAt,
      })),
    };
  }

  async updateUserStatus(id: string, status: string) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(MSG.ADMIN_USER_NOT_FOUND);
    }

    user.status = status;
    await this.userRepository.save(user);

    return { messageId: MSG.ADMIN_STATUS_UPDATED };
  }

  async getTransactions(query: PaginationQueryDto) {
    const { page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const [items, total] = await this.transactionRepository.findAndCount({
      relations: ['user'],
      skip,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return new PaginatedResponse(items, total, page, pageSize);
  }

  async getTransactionDetail(id: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!transaction) {
      throw new NotFoundException(MSG.NOT_FOUND);
    }

    return {
      id: transaction.id,
      userId: transaction.userId,
      username: transaction.user?.username,
      email: transaction.user?.email,
      type: transaction.type,
      amount: Number(transaction.amount),
      fee: Number(transaction.fee),
      status: transaction.status,
      remark: transaction.remark,
      relatedId: transaction.relatedId,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
    };
  }

  async getAgents(query: PaginationQueryDto) {
    const { page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const [items, total] = await this.agentRepository.findAndCount({
      relations: ['user'],
      skip,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return new PaginatedResponse(items, total, page, pageSize);
  }

  async getDashboard() {
    const totalUsers = await this.userRepository.count();
    const totalAgents = await this.agentRepository.count();
    const totalTransactions = await this.transactionRepository.count();

    // Today's statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayUsers = await this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :today', { today })
      .getCount();

    const todayTransactions = await this.transactionRepository
      .createQueryBuilder('tx')
      .where('tx.createdAt >= :today', { today })
      .getCount();

    return {
      totalUsers,
      totalAgents,
      totalTransactions,
      todayUsers,
      todayTransactions,
    };
  }
}
