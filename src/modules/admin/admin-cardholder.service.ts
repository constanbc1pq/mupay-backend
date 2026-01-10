import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cardholder } from '@database/entities/cardholder.entity';
import { Card } from '@database/entities/card.entity';
import { MSG } from '@common/constants/messages';
import { PaginatedResponse } from '@common/dto/api-response.dto';

export interface GetCardholdersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  userId?: string;
}

@Injectable()
export class AdminCardholderService {
  constructor(
    @InjectRepository(Cardholder)
    private cardholderRepository: Repository<Cardholder>,
    @InjectRepository(Card)
    private cardRepository: Repository<Card>,
  ) {}

  async getCardholders(params: GetCardholdersParams) {
    const { page = 1, pageSize = 10, search, status, userId } = params;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.cardholderRepository
      .createQueryBuilder('cardholder')
      .leftJoinAndSelect('cardholder.user', 'user')
      .leftJoinAndSelect('cardholder.provider', 'provider')
      .orderBy('cardholder.createdAt', 'DESC')
      .skip(skip)
      .take(pageSize);

    if (search) {
      queryBuilder.andWhere(
        '(cardholder.firstName LIKE :search OR cardholder.lastName LIKE :search OR cardholder.email LIKE :search OR user.username LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('cardholder.status = :status', { status });
    }

    if (userId) {
      queryBuilder.andWhere('cardholder.userId = :userId', { userId });
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponse(
      items.map(item => ({
        id: item.id,
        odooId: item.providerCardholderId,
        odooPartnerId: item.providerCardholderId,
        userId: item.userId,
        username: item.user?.username,
        firstName: item.firstName,
        lastName: item.lastName,
        email: item.email,
        phone: item.phone,
        countryCode: item.country,
        status: item.status,
        kycStatus: item.kycStatus,
        numberOfCards: item.numberOfCards,
        providerName: item.provider?.name,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total,
      page,
      pageSize,
    );
  }

  async getCardholderDetail(id: string) {
    const cardholder = await this.cardholderRepository.findOne({
      where: { id },
      relations: ['user', 'provider'],
    });

    if (!cardholder) {
      throw new NotFoundException(MSG.NOT_FOUND);
    }

    // Get cards for this cardholder
    const cards = await this.cardRepository.find({
      where: { cardholderId: id },
      order: { createdAt: 'DESC' },
    });

    return {
      id: cardholder.id,
      odooId: cardholder.providerCardholderId,
      odooPartnerId: cardholder.providerCardholderId,
      userId: cardholder.userId,
      username: cardholder.user?.username,
      firstName: cardholder.firstName,
      lastName: cardholder.lastName,
      email: cardholder.email,
      phone: cardholder.phone,
      countryCode: cardholder.country,
      nationality: cardholder.nationality,
      dateOfBirth: cardholder.dateOfBirth,
      idType: cardholder.idType,
      addressLine1: cardholder.addressLine1,
      addressLine2: cardholder.addressLine2,
      city: cardholder.city,
      state: cardholder.state,
      postalCode: cardholder.postalCode,
      status: cardholder.status,
      kycStatus: cardholder.kycStatus,
      kycLevel: cardholder.kycLevel,
      numberOfCards: cardholder.numberOfCards,
      providerName: cardholder.provider?.name,
      createdAt: cardholder.createdAt,
      updatedAt: cardholder.updatedAt,
      cards: cards.map(card => ({
        id: card.id,
        cardNumber: card.cardNumberLast4 ? `****${card.cardNumberLast4}` : card.cardNumber,
        expiryDate: card.expiryDate,
        balance: Number(card.balance),
        availableBalance: Number(card.availableBalance),
        currency: card.currency,
        status: card.status,
        cardForm: card.cardForm,
        cardBrand: card.cardBrand,
        createdAt: card.createdAt,
      })),
    };
  }

  async getCardholdersByUser(userId: string) {
    const cardholders = await this.cardholderRepository.find({
      where: { userId },
      relations: ['provider'],
      order: { createdAt: 'DESC' },
    });

    return cardholders.map(item => ({
      id: item.id,
      odooId: item.providerCardholderId,
      odooPartnerId: item.providerCardholderId,
      userId: item.userId,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      phone: item.phone,
      countryCode: item.country,
      status: item.status,
      kycStatus: item.kycStatus,
      numberOfCards: item.numberOfCards,
      providerName: item.provider?.name,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }
}
