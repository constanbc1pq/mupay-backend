import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { KycRecord, KycStatus } from '@database/entities/kyc-record.entity';
import { User } from '@database/entities/user.entity';
import { MSG } from '@common/constants/messages';
import { SubmitBasicKycDto, SubmitAdvancedKycDto } from './dto/kyc.dto';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  private readonly isDev: boolean;

  constructor(
    @InjectRepository(KycRecord)
    private kycRepository: Repository<KycRecord>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {
    this.isDev = this.configService.get<string>('nodeEnv') === 'development';
  }

  async getStatus(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    // Get pending KYC record if any
    const pendingRecord = await this.kycRepository.findOne({
      where: { userId, status: KycStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    // Get last rejected record
    const rejectedRecord = await this.kycRepository.findOne({
      where: { userId, status: KycStatus.REJECTED },
      order: { createdAt: 'DESC' },
    });

    return {
      level: user.kycLevel,
      status: pendingRecord ? 'pending' : (rejectedRecord ? 'rejected' : 'none'),
      rejectReason: rejectedRecord?.rejectReason,
      pendingRecord: pendingRecord ? {
        id: pendingRecord.id,
        level: pendingRecord.level,
        createdAt: pendingRecord.createdAt,
      } : null,
    };
  }

  async submitBasicKyc(userId: string, dto: SubmitBasicKycDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    if (user.kycLevel >= 1) {
      throw new BadRequestException(MSG.KYC_ALREADY_VERIFIED);
    }

    // Check for pending KYC
    const pendingRecord = await this.kycRepository.findOne({
      where: { userId, status: KycStatus.PENDING },
    });
    if (pendingRecord) {
      throw new BadRequestException(MSG.KYC_PENDING_REVIEW);
    }

    // Create KYC record
    const kycRecord = this.kycRepository.create({
      userId,
      level: 1,
      realName: dto.realName,
      idType: dto.idType,
      idNumber: dto.idNumber,
      status: KycStatus.PENDING,
    });

    await this.kycRepository.save(kycRecord);

    // In development mode, auto-approve
    if (this.isDev) {
      this.logger.warn(`[DEV] Auto-approving basic KYC for user ${userId}`);
      await this.autoApprove(kycRecord.id, userId);
    }

    return { messageId: MSG.KYC_SUBMIT_SUCCESS };
  }

  async submitAdvancedKyc(userId: string, dto: SubmitAdvancedKycDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    if (user.kycLevel < 1) {
      throw new BadRequestException(MSG.KYC_LEVEL_INSUFFICIENT);
    }

    if (user.kycLevel >= 2) {
      throw new BadRequestException(MSG.KYC_ALREADY_VERIFIED);
    }

    // Check for pending KYC
    const pendingRecord = await this.kycRepository.findOne({
      where: { userId, status: KycStatus.PENDING, level: 2 },
    });
    if (pendingRecord) {
      throw new BadRequestException(MSG.KYC_PENDING_REVIEW);
    }

    // Get basic KYC info
    const basicRecord = await this.kycRepository.findOne({
      where: { userId, level: 1, status: KycStatus.APPROVED },
    });

    // Create advanced KYC record
    const kycRecord = this.kycRepository.create({
      userId,
      level: 2,
      realName: basicRecord?.realName,
      idType: basicRecord?.idType,
      idNumber: basicRecord?.idNumber,
      idFrontUrl: dto.idFrontUrl,
      idBackUrl: dto.idBackUrl,
      holdingIdUrl: dto.holdingIdUrl,
      status: KycStatus.PENDING,
    });

    await this.kycRepository.save(kycRecord);

    // In development mode, auto-approve
    if (this.isDev) {
      this.logger.warn(`[DEV] Auto-approving advanced KYC for user ${userId}`);
      await this.autoApprove(kycRecord.id, userId);
    }

    return { messageId: MSG.KYC_SUBMIT_SUCCESS };
  }

  async faceVerify(userId: string, faceImage: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    // Get pending L2 KYC record
    const pendingRecord = await this.kycRepository.findOne({
      where: { userId, level: 2, status: KycStatus.PENDING },
    });

    if (!pendingRecord) {
      throw new BadRequestException(MSG.KYC_LEVEL_INSUFFICIENT);
    }

    // In development mode, always pass
    if (this.isDev) {
      this.logger.warn(`[DEV] Auto-passing face verification for user ${userId}`);
      pendingRecord.faceVerified = true;
      await this.kycRepository.save(pendingRecord);

      // Auto-approve
      await this.autoApprove(pendingRecord.id, userId);

      return { success: true, messageId: MSG.KYC_SUBMIT_SUCCESS };
    }

    // TODO: Integrate with AWS Rekognition or other face verification service
    // For now, just mark as verified
    pendingRecord.faceVerified = true;
    await this.kycRepository.save(pendingRecord);

    return { success: true, messageId: MSG.KYC_SUBMIT_SUCCESS };
  }

  async getRecords(userId: string) {
    const records = await this.kycRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return records.map(record => ({
      id: record.id,
      level: record.level,
      status: record.status,
      rejectReason: record.rejectReason,
      createdAt: record.createdAt,
      reviewedAt: record.reviewedAt,
    }));
  }

  private async autoApprove(recordId: string, userId: string) {
    const record = await this.kycRepository.findOne({ where: { id: recordId } });
    if (!record) return;

    record.status = KycStatus.APPROVED;
    record.reviewedAt = new Date();
    await this.kycRepository.save(record);

    // Update user KYC level
    await this.userRepository.update(userId, { kycLevel: record.level });
  }

  // ==================== Admin Methods ====================

  async getPendingList(page: number = 1, limit: number = 20) {
    const [records, total] = await this.kycRepository.findAndCount({
      where: { status: KycStatus.PENDING },
      relations: ['user'],
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: records.map(r => ({
        id: r.id,
        userId: r.userId,
        username: r.user?.username,
        level: r.level,
        realName: r.realName,
        idType: r.idType,
        idNumber: r.idNumber,
        idFrontUrl: r.idFrontUrl,
        idBackUrl: r.idBackUrl,
        holdingIdUrl: r.holdingIdUrl,
        faceVerified: r.faceVerified,
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async getRecordDetail(recordId: string) {
    const record = await this.kycRepository.findOne({
      where: { id: recordId },
      relations: ['user'],
    });

    if (!record) {
      throw new NotFoundException(MSG.NOT_FOUND);
    }

    return {
      id: record.id,
      userId: record.userId,
      username: record.user?.username,
      email: record.user?.email,
      level: record.level,
      realName: record.realName,
      idType: record.idType,
      idNumber: record.idNumber,
      idFrontUrl: record.idFrontUrl,
      idBackUrl: record.idBackUrl,
      holdingIdUrl: record.holdingIdUrl,
      faceVerified: record.faceVerified,
      status: record.status,
      rejectReason: record.rejectReason,
      createdAt: record.createdAt,
      reviewedAt: record.reviewedAt,
    };
  }

  async approve(recordId: string, adminId: string) {
    const record = await this.kycRepository.findOne({ where: { id: recordId } });
    if (!record) {
      throw new NotFoundException(MSG.NOT_FOUND);
    }

    if (record.status !== KycStatus.PENDING) {
      throw new BadRequestException(MSG.INVALID_PARAMS);
    }

    record.status = KycStatus.APPROVED;
    record.reviewedBy = adminId;
    record.reviewedAt = new Date();
    await this.kycRepository.save(record);

    // Update user KYC level
    await this.userRepository.update(record.userId, { kycLevel: record.level });

    return { success: true };
  }

  async reject(recordId: string, adminId: string, rejectReason: string) {
    const record = await this.kycRepository.findOne({ where: { id: recordId } });
    if (!record) {
      throw new NotFoundException(MSG.NOT_FOUND);
    }

    if (record.status !== KycStatus.PENDING) {
      throw new BadRequestException(MSG.INVALID_PARAMS);
    }

    record.status = KycStatus.REJECTED;
    record.rejectReason = rejectReason;
    record.reviewedBy = adminId;
    record.reviewedAt = new Date();
    await this.kycRepository.save(record);

    return { success: true };
  }
}
