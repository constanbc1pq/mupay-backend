import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Remittance, RemittanceStatus } from '@database/entities/remittance.entity';
import { UsdtWithdraw, WithdrawStatus, WithdrawNetwork } from '@database/entities/usdt-withdraw.entity';
import { Country } from '@database/entities/country.entity';
import { Bank } from '@database/entities/bank.entity';
import { ExchangeRate } from '@database/entities/exchange-rate.entity';
import { MSG } from '@common/constants/messages';
import { UserService } from '../user/user.service';
import { WalletService } from '../wallet/wallet.service';
import { PaginationQueryDto, PaginatedResponse } from '@common/dto/api-response.dto';
import { BankRemittanceDto } from './dto/bank-remittance.dto';
import { UsdtWithdrawDto } from './dto/usdt-withdraw.dto';
import { FeeCalcDto } from './dto/fee-calc.dto';

@Injectable()
export class RemittanceService {
  private readonly BANK_REMITTANCE_FEE_RATE = 0.02;
  private readonly BANK_REMITTANCE_FEE_FIXED = 2;
  private readonly USDT_WITHDRAW_FEE = 1;

  constructor(
    @InjectRepository(Remittance)
    private remittanceRepository: Repository<Remittance>,
    @InjectRepository(UsdtWithdraw)
    private usdtWithdrawRepository: Repository<UsdtWithdraw>,
    @InjectRepository(Country)
    private countryRepository: Repository<Country>,
    @InjectRepository(Bank)
    private bankRepository: Repository<Bank>,
    @InjectRepository(ExchangeRate)
    private exchangeRateRepository: Repository<ExchangeRate>,
    private userService: UserService,
    private walletService: WalletService,
  ) {}

  async getCountries() {
    const countries = await this.countryRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    // Return mock data if no countries in DB
    if (countries.length === 0) {
      return [
        { code: 'CN', name: '中国大陆', flag: '🇨🇳', currency: 'CNY' },
        { code: 'HK', name: '中国香港', flag: '🇭🇰', currency: 'HKD' },
        { code: 'US', name: '美国', flag: '🇺🇸', currency: 'USD' },
        { code: 'JP', name: '日本', flag: '🇯🇵', currency: 'JPY' },
        { code: 'SG', name: '新加坡', flag: '🇸🇬', currency: 'SGD' },
      ];
    }

    return countries;
  }

  async getBanks(countryCode: string) {
    const banks = await this.bankRepository.find({
      where: { countryCode, isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    // Return mock data if no banks in DB
    if (banks.length === 0 && countryCode === 'CN') {
      return [
        { code: 'ICBC', name: '中国工商银行' },
        { code: 'CCB', name: '中国建设银行' },
        { code: 'ABC', name: '中国农业银行' },
        { code: 'BOC', name: '中国银行' },
        { code: 'CMB', name: '招商银行' },
      ];
    }

    return banks;
  }

  async getRate(currency: string) {
    const pair = `USDT_${currency}`;
    const rate = await this.exchangeRateRepository.findOne({ where: { pair } });

    // Return mock rate if not in DB
    const mockRates: Record<string, number> = {
      USDT_CNY: 7.18,
      USDT_HKD: 7.78,
      USDT_USD: 1.0,
      USDT_JPY: 149.5,
      USDT_SGD: 1.34,
    };

    return {
      pair,
      rate: rate?.rate || mockRates[pair] || 1,
      updatedAt: rate?.updatedAt || new Date(),
    };
  }

  async calcFee(dto: FeeCalcDto) {
    const { amount, type } = dto;

    if (type === 'bank') {
      const fee = amount * this.BANK_REMITTANCE_FEE_RATE + this.BANK_REMITTANCE_FEE_FIXED;
      return {
        amount,
        fee,
        total: amount + fee,
        feeDescription: `${this.BANK_REMITTANCE_FEE_RATE * 100}% + ${this.BANK_REMITTANCE_FEE_FIXED}U`,
      };
    } else {
      return {
        amount,
        fee: this.USDT_WITHDRAW_FEE,
        total: amount + this.USDT_WITHDRAW_FEE,
        feeDescription: `${this.USDT_WITHDRAW_FEE}U`,
      };
    }
  }

  async createBankRemittance(userId: string, dto: BankRemittanceDto) {
    // Verify payment password
    await this.userService.verifyPaymentPassword(userId, dto.paymentPassword);

    const fee = dto.amount * this.BANK_REMITTANCE_FEE_RATE + this.BANK_REMITTANCE_FEE_FIXED;
    const total = dto.amount + fee;

    // Check balance
    const wallet = await this.walletService.getWalletByUserId(userId);
    if (Number(wallet.balance) < total) {
      throw new BadRequestException(MSG.WALLET_BALANCE_INSUFFICIENT);
    }

    // Get exchange rate
    const rateData = await this.getRate(dto.currency || 'CNY');
    const localAmount = dto.amount * rateData.rate;

    // Deduct balance
    await this.walletService.updateBalance(userId, -total);

    // Create remittance order
    const remittance = this.remittanceRepository.create({
      userId,
      countryCode: dto.countryCode,
      bankCode: dto.bankCode,
      accountName: dto.accountName,
      accountNumber: dto.accountNumber,
      amount: dto.amount,
      fee,
      rate: rateData.rate,
      localAmount,
      status: RemittanceStatus.PROCESSING,
    });

    await this.remittanceRepository.save(remittance);

    return {
      messageId: MSG.REMIT_ORDER_CREATED,
      orderId: remittance.id,
      amount: dto.amount,
      fee,
      localAmount,
      estimatedArrival: 'T+1',
    };
  }

  async createUsdtWithdraw(userId: string, dto: UsdtWithdrawDto) {
    // Verify payment password
    await this.userService.verifyPaymentPassword(userId, dto.paymentPassword);

    const total = dto.amount + this.USDT_WITHDRAW_FEE;

    // Check balance
    const wallet = await this.walletService.getWalletByUserId(userId);
    if (Number(wallet.balance) < total) {
      throw new BadRequestException(MSG.WALLET_BALANCE_INSUFFICIENT);
    }

    // Deduct balance
    await this.walletService.updateBalance(userId, -total);

    // Create withdraw order
    const withdraw = this.usdtWithdrawRepository.create({
      userId,
      network: dto.network as WithdrawNetwork,
      address: dto.address,
      amount: dto.amount,
      fee: this.USDT_WITHDRAW_FEE,
      status: WithdrawStatus.PROCESSING,
    });

    await this.usdtWithdrawRepository.save(withdraw);

    return {
      messageId: MSG.REMIT_USDT_WITHDRAW_SUCCESS,
      orderId: withdraw.id,
      amount: dto.amount,
      fee: this.USDT_WITHDRAW_FEE,
      estimatedTime: '约10分钟',
    };
  }

  async getOrders(userId: string, query: PaginationQueryDto) {
    const { page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    // Get both remittance and withdraw orders
    const [remittances, remittanceTotal] = await this.remittanceRepository.findAndCount({
      where: { userId },
      skip,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    const [withdraws, withdrawTotal] = await this.usdtWithdrawRepository.findAndCount({
      where: { userId },
      skip,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    const orders = [
      ...remittances.map((r) => ({ ...r, orderType: 'bank' })),
      ...withdraws.map((w) => ({ ...w, orderType: 'usdt' })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return new PaginatedResponse(orders, remittanceTotal + withdrawTotal, page, pageSize);
  }

  async getOrderDetail(userId: string, orderId: string) {
    // Try to find in remittance
    const remittance = await this.remittanceRepository.findOne({
      where: { id: orderId, userId },
    });
    if (remittance) {
      return { ...remittance, orderType: 'bank' };
    }

    // Try to find in withdraw
    const withdraw = await this.usdtWithdrawRepository.findOne({
      where: { id: orderId, userId },
    });
    if (withdraw) {
      return { ...withdraw, orderType: 'usdt' };
    }

    throw new NotFoundException(MSG.REMIT_ORDER_NOT_FOUND);
  }
}
