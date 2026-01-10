import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Cardholder,
  CardholderStatus,
  CardholderKycStatus,
  CardholderIdType,
} from '../../database/entities/cardholder.entity';
import { CardProvider, CardProviderStatus } from '../../database/entities/card-provider.entity';
import { User } from '../../database/entities/user.entity';
import { KycRecord } from '../../database/entities/kyc-record.entity';
import { CardProviderManagerService } from '../../services/card-provider/card-provider-manager.service';
import { CreateCardholderDto, UpdateCardholderDto } from './dto';
import { MSG } from '../../common/constants/messages';

/**
 * 持卡人检查结果
 */
export interface CardholderCheckResult {
  canCreate: boolean;
  reason?: string;
  kycLevel: number;
  requiredKycLevel: number;
  existingCardholders: {
    providerId: string;
    providerName: string;
    status: CardholderStatus;
  }[];
}

/**
 * 持卡人服务
 */
@Injectable()
export class CardholderService {
  private readonly logger = new Logger(CardholderService.name);

  constructor(
    @InjectRepository(Cardholder)
    private readonly cardholderRepo: Repository<Cardholder>,
    @InjectRepository(CardProvider)
    private readonly providerRepo: Repository<CardProvider>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(KycRecord)
    private readonly kycRepo: Repository<KycRecord>,
    private readonly providerManager: CardProviderManagerService,
  ) {}

  /**
   * 检查用户是否可以创建持卡人
   */
  async checkCanCreateCardholder(userId: string): Promise<CardholderCheckResult> {
    // 获取用户 KYC 等级
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const kycLevel = user.kycLevel || 0;
    const requiredKycLevel = 1; // 最低需要 KYC Level 1

    // 获取已存在的持卡人
    const existingCardholders = await this.cardholderRepo.find({
      where: { userId },
      relations: ['provider'],
    });

    const existingList = existingCardholders.map((ch) => ({
      providerId: ch.providerId,
      providerName: ch.provider?.name || 'Unknown',
      status: ch.status,
    }));

    // 检查 KYC 等级
    if (kycLevel < requiredKycLevel) {
      return {
        canCreate: false,
        reason: `KYC level ${requiredKycLevel} required, current level is ${kycLevel}`,
        kycLevel,
        requiredKycLevel,
        existingCardholders: existingList,
      };
    }

    return {
      canCreate: true,
      kycLevel,
      requiredKycLevel,
      existingCardholders: existingList,
    };
  }

  /**
   * 获取用户在指定服务商的持卡人信息
   */
  async getCardholder(userId: string, providerId?: string): Promise<Cardholder | null> {
    const where: any = { userId };
    if (providerId) {
      where.providerId = providerId;
    }

    return this.cardholderRepo.findOne({
      where,
      relations: ['provider'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 获取用户所有持卡人信息
   */
  async getAllCardholders(userId: string): Promise<Cardholder[]> {
    return this.cardholderRepo.find({
      where: { userId },
      relations: ['provider'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 创建持卡人
   */
  async createCardholder(userId: string, dto: CreateCardholderDto): Promise<Cardholder> {
    // 检查是否可以创建
    const checkResult = await this.checkCanCreateCardholder(userId);
    if (!checkResult.canCreate) {
      throw new BadRequestException(checkResult.reason);
    }

    // 检查服务商是否存在且可用
    const provider = await this.providerRepo.findOne({
      where: { id: dto.providerId, status: CardProviderStatus.ACTIVE },
    });
    if (!provider) {
      throw new BadRequestException('Provider not found or inactive');
    }

    // 检查是否已存在该服务商的持卡人
    const existing = await this.cardholderRepo.findOne({
      where: { userId, providerId: dto.providerId },
    });
    if (existing) {
      throw new BadRequestException('Cardholder already exists for this provider');
    }

    // 获取用户 KYC 信息填充默认值
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const kycRecord = await this.kycRepo.findOne({
      where: { userId, status: 'approved' as any },
      order: { level: 'DESC' },
    });

    // 调用服务商 API 创建持卡人
    const providerAdapter = this.providerManager.getProvider(provider.code);
    if (!providerAdapter) {
      throw new BadRequestException('Provider adapter not available');
    }

    // Map idType to provider format (driving_license -> driver_license)
    const idTypeValue = dto.idType || CardholderIdType.PASSPORT;
    const providerIdType = idTypeValue === CardholderIdType.DRIVING_LICENSE
      ? 'driver_license'
      : idTypeValue as 'passport' | 'id_card' | 'driver_license';

    const createParams = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone || user?.phone || '',
      idType: providerIdType,
      idNumber: dto.idNumber || kycRecord?.idNumber || '',
      nationality: dto.nationality || dto.country || 'CN',
      dateOfBirth: dto.dateOfBirth || '',
      address: {
        line1: dto.addressLine1 || '',
        line2: dto.addressLine2,
        city: dto.city || '',
        state: dto.state,
        country: dto.country || dto.nationality || 'CN',
        postalCode: dto.postalCode || '',
      },
    };

    const response = await providerAdapter.createCardholder(createParams);

    if (!response.success) {
      this.logger.error(
        `Failed to create cardholder: ${response.error?.message}`,
        response.error,
      );
      throw new BadRequestException(
        response.error?.message || 'Failed to create cardholder with provider',
      );
    }

    // 保存到数据库
    const cardholderData: any = {
      userId,
      providerId: dto.providerId,
      providerCardholderId: response.data!.providerCardholderId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      idType: dto.idType || CardholderIdType.PASSPORT,
      idNumber: dto.idNumber,
      nationality: dto.nationality,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2,
      city: dto.city,
      state: dto.state,
      country: dto.country,
      postalCode: dto.postalCode,
      kycStatus: this.mapKycStatus(response.data!.kycStatus),
      status: this.mapStatus(response.data!.status),
      providerMetadata: response.data!.metadata || {},
      lastSyncAt: new Date(),
    };

    if (dto.dateOfBirth) {
      cardholderData.dateOfBirth = new Date(dto.dateOfBirth);
    }

    const cardholder = this.cardholderRepo.create(cardholderData);

    await this.cardholderRepo.save(cardholder);

    this.logger.log(
      `Cardholder created: userId=${userId}, providerId=${dto.providerId}, providerCardholderId=${response.data!.providerCardholderId}`,
    );

    const result = await this.getCardholder(userId, dto.providerId);
    return result!;
  }

  /**
   * 更新持卡人信息
   */
  async updateCardholder(
    userId: string,
    cardholderId: string,
    dto: UpdateCardholderDto,
  ): Promise<Cardholder> {
    const cardholder = await this.cardholderRepo.findOne({
      where: { id: cardholderId, userId },
      relations: ['provider'],
    });

    if (!cardholder) {
      throw new NotFoundException('Cardholder not found');
    }

    // 调用服务商 API 更新持卡人
    const providerAdapter = this.providerManager.getProvider(cardholder.provider.code);
    if (!providerAdapter) {
      throw new BadRequestException('Provider adapter not available');
    }

    const updateParams = {
      providerCardholderId: cardholder.providerCardholderId,
      email: dto.email,
      phone: dto.phone,
      address: (dto.addressLine1 || dto.city || dto.country) ? {
        line1: dto.addressLine1,
        line2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        postalCode: dto.postalCode,
      } : undefined,
    };

    const response = await providerAdapter.updateCardholder(updateParams);

    if (!response.success) {
      this.logger.error(
        `Failed to update cardholder: ${response.error?.message}`,
        response.error,
      );
      throw new BadRequestException(
        response.error?.message || 'Failed to update cardholder with provider',
      );
    }

    // 更新本地数据库
    if (dto.email) cardholder.email = dto.email;
    if (dto.phone) cardholder.phone = dto.phone;
    if (dto.addressLine1) cardholder.addressLine1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined) cardholder.addressLine2 = dto.addressLine2;
    if (dto.city) cardholder.city = dto.city;
    if (dto.state) cardholder.state = dto.state;
    if (dto.country) cardholder.country = dto.country;
    if (dto.postalCode) cardholder.postalCode = dto.postalCode;

    cardholder.kycStatus = this.mapKycStatus(response.data!.kycStatus);
    cardholder.status = this.mapStatus(response.data!.status);
    cardholder.providerMetadata = response.data!.metadata || {};
    cardholder.lastSyncAt = new Date();

    await this.cardholderRepo.save(cardholder);

    this.logger.log(`Cardholder updated: id=${cardholderId}`);

    return cardholder;
  }

  /**
   * 同步持卡人信息
   */
  async syncCardholder(cardholderId: string): Promise<Cardholder> {
    const cardholder = await this.cardholderRepo.findOne({
      where: { id: cardholderId },
      relations: ['provider'],
    });

    if (!cardholder) {
      throw new NotFoundException('Cardholder not found');
    }

    const providerAdapter = this.providerManager.getProvider(cardholder.provider.code);
    if (!providerAdapter) {
      throw new BadRequestException('Provider adapter not available');
    }

    const response = await providerAdapter.retrieveCardholder(cardholder.providerCardholderId);

    if (!response.success) {
      this.logger.error(
        `Failed to sync cardholder: ${response.error?.message}`,
        response.error,
      );
      throw new BadRequestException(
        response.error?.message || 'Failed to sync cardholder from provider',
      );
    }

    // 更新本地数据
    cardholder.kycStatus = this.mapKycStatus(response.data!.kycStatus);
    cardholder.status = this.mapStatus(response.data!.status);
    cardholder.numberOfCards = response.data!.metadata?.number_of_cards || cardholder.numberOfCards;
    cardholder.providerMetadata = response.data!.metadata || {};
    cardholder.lastSyncAt = new Date();

    await this.cardholderRepo.save(cardholder);

    return cardholder;
  }

  /**
   * 映射 KYC 状态
   */
  private mapKycStatus(status: string): CardholderKycStatus {
    switch (status) {
      case 'approved':
        return CardholderKycStatus.APPROVED;
      case 'rejected':
        return CardholderKycStatus.REJECTED;
      case 'not_required':
        return CardholderKycStatus.NOT_REQUIRED;
      default:
        return CardholderKycStatus.PENDING;
    }
  }

  /**
   * 映射持卡人状态
   */
  private mapStatus(status: string): CardholderStatus {
    switch (status) {
      case 'active':
        return CardholderStatus.ACTIVE;
      case 'suspended':
        return CardholderStatus.SUSPENDED;
      default:
        return CardholderStatus.INACTIVE;
    }
  }
}
