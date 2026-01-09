import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Topup, TopupStatus } from '@database/entities/topup.entity';
import { MobileOperator } from '@database/entities/mobile-operator.entity';
import { MSG } from '@common/constants/messages';
import { UserService } from '../user/user.service';
import { WalletService } from '../wallet/wallet.service';
import { PaginationQueryDto, PaginatedResponse } from '@common/dto/api-response.dto';
import { CreateTopupDto } from './dto/create-topup.dto';

@Injectable()
export class TopupService {
  private readonly PACKAGES = [
    { amount: 10, price: 10 },
    { amount: 20, price: 20 },
    { amount: 30, price: 30 },
    { amount: 50, price: 50 },
    { amount: 100, price: 100 },
    { amount: 200, price: 200 },
  ];

  constructor(
    @InjectRepository(Topup)
    private topupRepository: Repository<Topup>,
    @InjectRepository(MobileOperator)
    private operatorRepository: Repository<MobileOperator>,
    private userService: UserService,
    private walletService: WalletService,
  ) {}

  async getOperators() {
    const operators = await this.operatorRepository.find({
      where: { isActive: true },
    });

    // Return mock data if no operators in DB
    if (operators.length === 0) {
      return [
        { code: 'CMCC', name: '中国移动', icon: '📱' },
        { code: 'CUCC', name: '中国联通', icon: '📱' },
        { code: 'CTCC', name: '中国电信', icon: '📱' },
      ];
    }

    return operators;
  }

  async getPackages() {
    return this.PACKAGES;
  }

  async createTopup(userId: string, dto: CreateTopupDto) {
    // Verify payment password
    await this.userService.verifyPaymentPassword(userId, dto.paymentPassword);

    // Validate package
    const pkg = this.PACKAGES.find((p) => p.amount === dto.amount);
    if (!pkg) {
      throw new BadRequestException(MSG.TOPUP_AMOUNT_INVALID);
    }

    // Check balance
    const wallet = await this.walletService.getWalletByUserId(userId);
    if (Number(wallet.balance) < pkg.price) {
      throw new BadRequestException(MSG.WALLET_BALANCE_INSUFFICIENT);
    }

    // Deduct balance
    await this.walletService.updateBalance(userId, -pkg.price);

    // Create topup order
    const topup = this.topupRepository.create({
      userId,
      operatorCode: dto.operatorCode,
      phoneNumber: dto.phoneNumber,
      amount: dto.amount,
      fee: 0,
      status: TopupStatus.PROCESSING,
    });

    await this.topupRepository.save(topup);

    // Simulate async processing - in real app, call third-party API
    setTimeout(async () => {
      topup.status = TopupStatus.COMPLETED;
      topup.completedAt = new Date();
      await this.topupRepository.save(topup);
    }, 3000);

    return {
      messageId: MSG.TOPUP_SUCCESS,
      orderId: topup.id,
      phoneNumber: dto.phoneNumber,
      amount: dto.amount,
    };
  }

  async getRecords(userId: string, query: PaginationQueryDto) {
    const { page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const [items, total] = await this.topupRepository.findAndCount({
      where: { userId },
      skip,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return new PaginatedResponse(items, total, page, pageSize);
  }
}
