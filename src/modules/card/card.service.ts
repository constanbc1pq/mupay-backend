import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import * as crypto from 'crypto';
import { Card, CardType, CardLevel, CardStatus } from '@database/entities/card.entity';
import { CardRecharge, CardRechargeStatus } from '@database/entities/card-recharge.entity';
import { CardProvider, CardProviderStatus } from '@database/entities/card-provider.entity';
import { CardProduct, CardProductStatus, CardForm, CardMode, CardBrand } from '@database/entities/card-product.entity';
import { Cardholder, CardholderStatus } from '@database/entities/cardholder.entity';
import { CardTransaction, CardTransactionType, CardTransactionStatus } from '@database/entities/card-transaction.entity';
import { MSG } from '@common/constants/messages';
import { UserService } from '../user/user.service';
import { WalletService } from '../wallet/wallet.service';
import { CardProviderManagerService } from '../../services/card-provider/card-provider-manager.service';
import { ApplyCardDto } from './dto/apply-card.dto';
import { ApplyCardV2Dto } from './dto/apply-card-v2.dto';
import { RechargeCardDto } from './dto/recharge-card.dto';
import { UpgradeCardDto } from './dto/upgrade-card.dto';
import { WithdrawCardDto } from './dto/withdraw-card.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { UpdateCardStatusDto } from './dto/update-card-status.dto';

/**
 * 卡服务商响应
 */
export interface ProviderInfo {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: CardProviderStatus;
  features?: string[];
  supportedCurrencies: string[];
  supportedCardForms: string[];
  supportedCardModes: string[];
  logoUrl?: string;
}

/**
 * 卡产品响应 (匹配前端 CardProduct 类型)
 */
export interface ProductInfo {
  id: string;
  providerId: string;
  providerCode: string;
  providerName: string;
  code: string;
  name: string;
  description: string;
  cardOrganization: string; // visa, mastercard, unionpay
  cardForm: string; // virtual, physical
  cardMode: string; // single, shared
  currency: string; // 主要货币
  currencies: string[]; // 支持的所有货币
  openFee: number;
  monthlyFee: number;
  rechargeFeeRate: number;
  withdrawFeeRate: number;
  minRecharge: number;
  maxRecharge: number;
  dailyLimit: number;
  monthlyLimit: number;
  features?: string[];
  status: string;
}

@Injectable()
export class CardService {
  private readonly logger = new Logger(CardService.name);

  // Legacy card types (backward compatibility)
  private readonly CARD_TYPES: Record<string, {
    name: string;
    description: string;
    openFee: number;
    monthlyFee: number;
    minDeposit: number;
    rechargeRate: number;
  }> = {
    enjoy: {
      name: '畅享卡',
      description: '仅限中国大陆使用',
      openFee: 10,
      monthlyFee: 2,
      minDeposit: 20,
      rechargeRate: 0.018,
    },
    universal: {
      name: '全能卡',
      description: '全球可用',
      openFee: 10,
      monthlyFee: 2,
      minDeposit: 50,
      rechargeRate: 0.018,
    },
  };

  private readonly CARD_LEVELS: Record<string, { monthlyLimit: number; upgradeFee: number }> = {
    regular: { monthlyLimit: 5000, upgradeFee: 0 },
    silver: { monthlyLimit: 20000, upgradeFee: 50 },
    gold: { monthlyLimit: 100000, upgradeFee: 100 },
  };

  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(CardRecharge)
    private readonly cardRechargeRepository: Repository<CardRecharge>,
    @InjectRepository(CardProvider)
    private readonly cardProviderRepository: Repository<CardProvider>,
    @InjectRepository(CardProduct)
    private readonly cardProductRepository: Repository<CardProduct>,
    @InjectRepository(Cardholder)
    private readonly cardholderRepository: Repository<Cardholder>,
    @InjectRepository(CardTransaction)
    private readonly cardTransactionRepository: Repository<CardTransaction>,
    private readonly userService: UserService,
    private readonly walletService: WalletService,
    private readonly providerManager: CardProviderManagerService,
  ) {}

  // ============ 服务商和产品查询 ============

  /**
   * 获取可用的卡服务商列表
   */
  async getProviders(): Promise<ProviderInfo[]> {
    const providers = await this.cardProviderRepository.find({
      where: { status: CardProviderStatus.ACTIVE },
      order: { priority: 'ASC' },
    });

    return providers.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description || undefined,
      status: p.status,
      features: this.getProviderFeatures(p),
      supportedCurrencies: p.supportedCurrencies || ['USD'],
      supportedCardForms: p.supportedCardForms || [],
      supportedCardModes: p.supportedCardModes || [],
      logoUrl: p.extraConfig?.logoUrl || undefined,
    }));
  }

  /**
   * 根据服务商配置生成特性列表 (返回 feature keys，前端负责翻译)
   */
  private getProviderFeatures(provider: CardProvider): string[] {
    const features: string[] = [];

    if (provider.supportedCardForms?.includes('virtual')) {
      features.push('virtual');
    }
    if (provider.supportedCardForms?.includes('physical')) {
      features.push('physical');
    }
    if (provider.supportedCurrencies?.includes('USD')) {
      features.push('usd');
    }
    if (Number(provider.rechargeFeeRate) <= 0.02) {
      features.push('lowFee');
    }
    if (provider.isHealthy) {
      features.push('stable');
    }

    return features;
  }

  /**
   * 获取可用的卡产品列表
   */
  async getProducts(providerId?: string): Promise<ProductInfo[]> {
    const where: any = {
      status: CardProductStatus.ACTIVE,
      isVisible: true,
    };
    if (providerId) {
      where.providerId = providerId;
    }

    const products = await this.cardProductRepository.find({
      where,
      relations: ['provider'],
      order: { sortOrder: 'ASC' },
    });

    return products.map((p) => this.mapProductToInfo(p));
  }

  /**
   * 映射产品实体到响应格式
   */
  private mapProductToInfo(p: CardProduct): ProductInfo {
    const currencies = p.currencies || ['USD'];
    return {
      id: p.id,
      providerId: p.providerId,
      providerCode: p.provider?.code || '',
      providerName: p.provider?.name || '',
      code: p.providerProductId,
      name: p.name,
      description: p.description || '',
      cardOrganization: p.cardBrand, // visa, mastercard, unionpay
      cardForm: p.cardForm, // virtual, physical
      cardMode: p.cardMode, // single, shared
      currency: currencies[0] || 'USD',
      currencies: currencies,
      openFee: Number(p.openFee),
      monthlyFee: Number(p.monthlyFee),
      rechargeFeeRate: Number(p.rechargeRate),
      withdrawFeeRate: Number(p.withdrawRate),
      minRecharge: Number(p.minDeposit),
      maxRecharge: Number(p.maxDeposit),
      dailyLimit: Number(p.dailyLimit),
      monthlyLimit: Number(p.monthlyLimit),
      features: p.features || [],
      status: p.status,
    };
  }

  /**
   * 获取单个产品详情
   */
  async getProductDetail(productId: string): Promise<ProductInfo | null> {
    const product = await this.cardProductRepository.findOne({
      where: { id: productId },
      relations: ['provider'],
    });

    if (!product) return null;

    return this.mapProductToInfo(product);
  }

  // ============ 卡片管理 (V2 - Provider Based) ============

  /**
   * 申请卡片 (V2 - 基于服务商/产品)
   */
  async applyCardV2(userId: string, dto: ApplyCardV2Dto): Promise<Card> {
    // 1. 验证产品
    const product = await this.cardProductRepository.findOne({
      where: { id: dto.productId, providerId: dto.providerId, status: CardProductStatus.ACTIVE },
      relations: ['provider'],
    });

    if (!product) {
      throw new BadRequestException('Product not found or inactive');
    }

    // 2. 验证服务商
    const provider = product.provider;
    if (!provider || provider.status !== CardProviderStatus.ACTIVE) {
      throw new BadRequestException('Provider not available');
    }

    // 3. 检查用户 KYC 等级
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userKycLevel = user.kycLevel || 0;
    if (userKycLevel < product.requiredKycLevel) {
      throw new BadRequestException(
        `KYC level ${product.requiredKycLevel} required, current level is ${userKycLevel}`,
      );
    }

    // 4. 检查持卡人 (必须先创建持卡人)
    const cardholder = await this.cardholderRepository.findOne({
      where: { userId, providerId: dto.providerId, status: CardholderStatus.ACTIVE },
    });

    if (!cardholder) {
      throw new BadRequestException(
        'Cardholder not found. Please create cardholder first.',
      );
    }

    // 5. 计算费用
    const openFee = Number(product.openFee);
    const initialBalance = dto.initialBalance || 0;
    const rechargeFee = initialBalance > 0 ? initialBalance * Number(product.rechargeRate) : 0;
    const totalCost = openFee + initialBalance + rechargeFee;

    // 6. 检查钱包余额
    const wallet = await this.walletService.getWalletByUserId(userId);
    if (Number(wallet.balance) < totalCost) {
      throw new BadRequestException(MSG.WALLET_BALANCE_INSUFFICIENT);
    }

    // 7. 调用服务商 API 创建卡片
    const providerAdapter = this.providerManager.getProvider(provider.code);
    if (!providerAdapter) {
      throw new BadRequestException('Provider adapter not available');
    }

    const currency = dto.currency || product.currencies[0] || 'USD';

    const createResponse = await providerAdapter.createCard({
      cardholderId: cardholder.providerCardholderId,
      productId: product.providerProductId,
      initialBalance: initialBalance,
      currency: currency,
    });

    if (!createResponse.success) {
      this.logger.error(`Failed to create card: ${createResponse.error?.message}`, createResponse.error);
      throw new BadRequestException(
        createResponse.error?.message || 'Failed to create card with provider',
      );
    }

    const cardInfo = createResponse.data!;

    // 8. 扣款
    await this.walletService.updateBalance(userId, -totalCost);

    // 9. 保存到数据库
    const cardData: Partial<Card> = {
      userId,
      providerId: dto.providerId,
      providerCardId: cardInfo.providerCardId,
      productId: dto.productId,
      cardholderId: cardholder.id,
      cardForm: product.cardForm,
      cardMode: product.cardMode,
      cardBrand: product.cardBrand,
      currency: currency,
      cardNumber: this.encrypt(cardInfo.cardNumberMasked), // Store masked for now
      cardNumberLast4: cardInfo.cardNumberMasked.slice(-4),
      expiryDate: cardInfo.expiryDate,
      cvv: this.encrypt('***'), // Placeholder - get from sensitive API when needed
      balance: cardInfo.balance,
      availableBalance: cardInfo.availableBalance,
      dailyLimit: cardInfo.dailyLimit || Number(product.dailyLimit),
      monthlyLimit: cardInfo.monthlyLimit || Number(product.monthlyLimit),
      dailyUsed: cardInfo.dailyUsed || 0,
      monthlyUsed: cardInfo.monthlyUsed || 0,
      status: this.mapProviderStatus(cardInfo.status),
      lastSyncAt: new Date(),
    };

    if (cardInfo.activatedAt) {
      cardData.activatedAt = new Date(cardInfo.activatedAt);
    }
    if (cardInfo.metadata) {
      cardData.providerMetadata = cardInfo.metadata;
    }

    const cardEntity = this.cardRepository.create(cardData);

    const savedCard = await this.cardRepository.save(cardEntity);

    this.logger.log(
      `Card created: userId=${userId}, providerId=${dto.providerId}, providerCardId=${cardInfo.providerCardId}`,
    );

    // 10. 创建充值记录 (如果有首充)
    if (initialBalance > 0) {
      const recharge = this.cardRechargeRepository.create({
        userId,
        cardId: savedCard.id,
        amount: initialBalance,
        fee: rechargeFee,
        status: CardRechargeStatus.COMPLETED,
        completedAt: new Date(),
      });
      await this.cardRechargeRepository.save(recharge);
    }

    return this.getCardById(userId, savedCard.id);
  }

  /**
   * 卡片充值 (调用服务商 API)
   */
  async rechargeCardV2(userId: string, cardId: string, dto: RechargeCardDto): Promise<Card> {
    // Verify payment password
    await this.userService.verifyPaymentPassword(userId, dto.paymentPassword);

    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
      relations: ['provider', 'product'],
    });

    if (!card) {
      throw new NotFoundException(MSG.CARD_NOT_FOUND);
    }

    if (card.status !== CardStatus.ACTIVE) {
      throw new BadRequestException(MSG.CARD_STATUS_ABNORMAL);
    }

    // 检查是否为新版卡 (有 providerCardId)
    if (!card.providerCardId || !card.provider) {
      // 使用旧版充值逻辑
      await this.rechargeCardLegacy(userId, cardId, dto);
      // Return updated card
      return this.getCardById(userId, cardId);
    }

    // 计算费用
    const rechargeRate = card.product ? Number(card.product.rechargeRate) : 0.018;
    const fee = dto.amount * rechargeRate;
    const totalCost = dto.amount + fee;

    // Check wallet balance
    const wallet = await this.walletService.getWalletByUserId(userId);
    if (Number(wallet.balance) < totalCost) {
      throw new BadRequestException(MSG.WALLET_BALANCE_INSUFFICIENT);
    }

    // 调用服务商 API
    const providerAdapter = this.providerManager.getProvider(card.provider.code);
    if (!providerAdapter) {
      throw new BadRequestException('Provider adapter not available');
    }

    const response = await providerAdapter.rechargeCard({
      providerCardId: card.providerCardId,
      amount: dto.amount,
      currency: card.currency,
    });

    if (!response.success) {
      this.logger.error(`Failed to recharge card: ${response.error?.message}`, response.error);
      throw new BadRequestException(
        response.error?.message || 'Failed to recharge card',
      );
    }

    // 扣款
    await this.walletService.updateBalance(userId, -totalCost);

    // 更新卡余额
    card.balance = response.data!.newBalance;
    card.availableBalance = response.data!.newBalance;
    card.lastSyncAt = new Date();
    await this.cardRepository.save(card);

    // 创建充值记录
    const recharge = this.cardRechargeRepository.create({
      userId,
      cardId,
      amount: dto.amount,
      fee,
      status: CardRechargeStatus.COMPLETED,
      completedAt: new Date(),
    });
    await this.cardRechargeRepository.save(recharge);

    this.logger.log(`Card recharged: cardId=${cardId}, amount=${dto.amount}`);

    return card;
  }

  /**
   * 卡片提现到钱包
   */
  async withdrawCard(userId: string, cardId: string, dto: WithdrawCardDto): Promise<Card> {
    // Verify payment password
    await this.userService.verifyPaymentPassword(userId, dto.paymentPassword);

    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
      relations: ['provider', 'product'],
    });

    if (!card) {
      throw new NotFoundException(MSG.CARD_NOT_FOUND);
    }

    if (card.status !== CardStatus.ACTIVE) {
      throw new BadRequestException(MSG.CARD_STATUS_ABNORMAL);
    }

    if (!card.providerCardId || !card.provider) {
      throw new BadRequestException('Card does not support withdraw operation');
    }

    // 检查卡余额
    if (Number(card.availableBalance) < dto.amount) {
      throw new BadRequestException('Insufficient card balance');
    }

    // 计算提现手续费
    const withdrawRate = card.product ? Number(card.product.withdrawRate) : 0;
    const fee = dto.amount * withdrawRate;
    const netAmount = dto.amount - fee;

    // 调用服务商 API
    const providerAdapter = this.providerManager.getProvider(card.provider.code);
    if (!providerAdapter) {
      throw new BadRequestException('Provider adapter not available');
    }

    const response = await providerAdapter.withdrawCard({
      providerCardId: card.providerCardId,
      amount: dto.amount,
      currency: card.currency,
      remark: dto.remark,
    });

    if (!response.success) {
      this.logger.error(`Failed to withdraw card: ${response.error?.message}`, response.error);
      throw new BadRequestException(
        response.error?.message || 'Failed to withdraw from card',
      );
    }

    // 增加钱包余额 (扣除手续费)
    await this.walletService.updateBalance(userId, netAmount);

    // 更新卡余额
    card.balance = response.data!.newBalance;
    card.availableBalance = response.data!.newBalance;
    card.lastSyncAt = new Date();
    await this.cardRepository.save(card);

    this.logger.log(`Card withdrawn: cardId=${cardId}, amount=${dto.amount}, netAmount=${netAmount}`);

    return card;
  }

  /**
   * 更新卡状态 (冻结/解冻/注销)
   */
  async updateCardStatus(userId: string, cardId: string, dto: UpdateCardStatusDto): Promise<Card> {
    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
      relations: ['provider'],
    });

    if (!card) {
      throw new NotFoundException(MSG.CARD_NOT_FOUND);
    }

    // 如果是新版卡，调用服务商 API
    if (card.providerCardId && card.provider) {
      const providerAdapter = this.providerManager.getProvider(card.provider.code);
      if (providerAdapter) {
        const response = await providerAdapter.updateCardStatus({
          providerCardId: card.providerCardId,
          status: dto.status,
          reason: dto.reason,
        });

        if (!response.success) {
          this.logger.error(`Failed to update card status: ${response.error?.message}`);
          throw new BadRequestException(
            response.error?.message || 'Failed to update card status',
          );
        }
      }
    }

    // 更新本地数据库
    card.status = this.mapStatusFromDto(dto.status);
    if (dto.reason) {
      card.statusReason = dto.reason;
    }
    card.lastSyncAt = new Date();
    await this.cardRepository.save(card);

    this.logger.log(`Card status updated: cardId=${cardId}, status=${dto.status}`);

    return card;
  }

  /**
   * 同步卡信息
   */
  async syncCard(userId: string, cardId: string): Promise<Card> {
    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
      relations: ['provider'],
    });

    if (!card) {
      throw new NotFoundException(MSG.CARD_NOT_FOUND);
    }

    if (!card.providerCardId || !card.provider) {
      throw new BadRequestException('Card does not support sync operation');
    }

    const providerAdapter = this.providerManager.getProvider(card.provider.code);
    if (!providerAdapter) {
      throw new BadRequestException('Provider adapter not available');
    }

    const response = await providerAdapter.retrieveCard(card.providerCardId);

    if (!response.success) {
      this.logger.error(`Failed to sync card: ${response.error?.message}`);
      throw new BadRequestException(
        response.error?.message || 'Failed to sync card',
      );
    }

    const cardInfo = response.data!;

    // Update local data
    card.balance = cardInfo.balance;
    card.availableBalance = cardInfo.availableBalance;
    card.dailyLimit = cardInfo.dailyLimit;
    card.monthlyLimit = cardInfo.monthlyLimit;
    card.dailyUsed = cardInfo.dailyUsed;
    card.monthlyUsed = cardInfo.monthlyUsed;
    card.status = this.mapProviderStatus(cardInfo.status);
    card.lastSyncAt = new Date();
    if (cardInfo.metadata) {
      card.providerMetadata = cardInfo.metadata;
    }

    await this.cardRepository.save(card);

    return card;
  }

  /**
   * 获取卡交易列表
   */
  async getCardTransactions(
    userId: string,
    cardId: string,
    dto: ListTransactionsDto,
  ): Promise<{ items: CardTransaction[]; total: number; page: number; pageSize: number }> {
    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
      relations: ['provider'],
    });

    if (!card) {
      throw new NotFoundException(MSG.CARD_NOT_FOUND);
    }

    // Build query conditions
    const where: any = { cardId };

    if (dto.type) {
      where.type = dto.type as CardTransactionType;
    }

    if (dto.status) {
      where.status = dto.status as CardTransactionStatus;
    }

    if (dto.startTime && dto.endTime) {
      where.transactionTime = Between(new Date(dto.startTime), new Date(dto.endTime));
    } else if (dto.startTime) {
      where.transactionTime = MoreThanOrEqual(new Date(dto.startTime));
    } else if (dto.endTime) {
      where.transactionTime = LessThanOrEqual(new Date(dto.endTime));
    }

    const page = dto.page || 1;
    const pageSize = dto.pageSize || 20;

    const [items, total] = await this.cardTransactionRepository.findAndCount({
      where,
      order: { transactionTime: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  /**
   * 同步卡交易 (从服务商拉取)
   */
  async syncCardTransactions(userId: string, cardId: string): Promise<number> {
    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
      relations: ['provider'],
    });

    if (!card) {
      throw new NotFoundException(MSG.CARD_NOT_FOUND);
    }

    if (!card.providerCardId || !card.provider) {
      throw new BadRequestException('Card does not support transaction sync');
    }

    const providerAdapter = this.providerManager.getProvider(card.provider.code);
    if (!providerAdapter) {
      throw new BadRequestException('Provider adapter not available');
    }

    // 获取最后同步时间
    const lastTx = await this.cardTransactionRepository.findOne({
      where: { cardId },
      order: { transactionTime: 'DESC' },
    });

    const response = await providerAdapter.listCardTransactions({
      cardId: card.providerCardId,
      startTime: lastTx?.transactionTime?.toISOString(),
      pageSize: 100,
    });

    if (!response.success) {
      this.logger.error(`Failed to sync transactions: ${response.error?.message}`);
      throw new BadRequestException(
        response.error?.message || 'Failed to sync transactions',
      );
    }

    let syncedCount = 0;

    for (const txInfo of response.data!.items) {
      // Check if already exists
      const existing = await this.cardTransactionRepository.findOne({
        where: { providerTransactionId: txInfo.providerTransactionId },
      });

      if (!existing) {
        const txData: any = {
          cardId: card.id,
          providerId: card.providerId,
          providerTransactionId: txInfo.providerTransactionId,
          type: this.mapTransactionType(txInfo.type),
          amount: txInfo.amount,
          currency: txInfo.currency,
          billingAmount: txInfo.billingAmount,
          billingCurrency: txInfo.billingCurrency,
          fee: txInfo.fee || 0,
          feeCurrency: txInfo.feeCurrency,
          merchantName: txInfo.merchantName,
          merchantCategory: txInfo.merchantCategory,
          merchantCity: txInfo.merchantCity,
          merchantCountry: txInfo.merchantCountry,
          status: this.mapTransactionStatus(txInfo.status),
          transactionTime: new Date(txInfo.transactionTime),
        };

        if (txInfo.declineReason) {
          txData.declineReason = txInfo.declineReason;
        }
        if (txInfo.cardBalanceAfter !== undefined) {
          txData.cardBalanceAfter = txInfo.cardBalanceAfter;
        }
        if (txInfo.postedTime) {
          txData.postedTime = new Date(txInfo.postedTime);
        }
        if (txInfo.metadata) {
          txData.providerMetadata = txInfo.metadata;
        }

        const tx = this.cardTransactionRepository.create(txData);
        await this.cardTransactionRepository.save(tx);
        syncedCount++;
      }
    }

    this.logger.log(`Synced ${syncedCount} transactions for card ${cardId}`);

    return syncedCount;
  }

  /**
   * 获取卡敏感信息 (卡号、CVV)
   */
  async getCardSensitiveInfo(userId: string, cardId: string, paymentPassword: string): Promise<{
    cardNumber: string;
    cvv: string;
    expiryDate: string;
    expiresIn: number;
  }> {
    // Verify payment password
    await this.userService.verifyPaymentPassword(userId, paymentPassword);

    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
      relations: ['provider'],
    });

    if (!card) {
      throw new NotFoundException(MSG.CARD_NOT_FOUND);
    }

    // 如果是新版卡，从服务商获取
    if (card.providerCardId && card.provider) {
      const providerAdapter = this.providerManager.getProvider(card.provider.code);
      if (providerAdapter) {
        const response = await providerAdapter.retrieveSensitiveCardDetails(card.providerCardId);
        if (response.success) {
          return {
            cardNumber: response.data!.cardNumber,
            cvv: response.data!.cvv,
            expiryDate: response.data!.expiryDate,
            expiresIn: 30, // seconds
          };
        }
      }
    }

    // 旧版卡，从本地解密
    return {
      cvv: this.decrypt(card.cvv),
      cardNumber: this.decrypt(card.cardNumber),
      expiryDate: card.expiryDate,
      expiresIn: 30,
    };
  }

  // ============ 旧版方法 (Backward Compatibility) ============

  async getCards(userId: string) {
    const cards = await this.cardRepository.find({
      where: { userId },
      relations: ['provider', 'product'],
      order: { createdAt: 'DESC' },
    });

    return cards.map((card) => ({
      ...card,
      cardNumber: card.cardNumberLast4
        ? `**** **** **** ${card.cardNumberLast4}`
        : this.maskCardNumber(this.decrypt(card.cardNumber)),
      cvv: '***',
    }));
  }

  async getCardById(userId: string, cardId: string): Promise<Card> {
    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
      relations: ['provider', 'product', 'cardholder'],
    });

    if (!card) {
      throw new NotFoundException(MSG.CARD_NOT_FOUND);
    }

    return card;
  }

  async getCardTypes() {
    return {
      types: this.CARD_TYPES,
      levels: this.CARD_LEVELS,
    };
  }

  async applyCard(userId: string, dto: ApplyCardDto) {
    const cardType = this.CARD_TYPES[dto.type];
    if (!cardType) {
      throw new BadRequestException(MSG.CARD_TYPE_INVALID);
    }

    const totalCost = cardType.openFee + cardType.minDeposit;

    // Check wallet balance
    const wallet = await this.walletService.getWalletByUserId(userId);
    if (Number(wallet.balance) < totalCost) {
      throw new BadRequestException(MSG.WALLET_BALANCE_INSUFFICIENT);
    }

    // Deduct balance
    await this.walletService.updateBalance(userId, -totalCost);

    // Generate card
    const cardNumber = this.generateCardNumber();
    const expiryDate = this.generateExpiryDate();
    const cvv = this.generateCvv();

    const card = this.cardRepository.create({
      userId,
      type: dto.type as CardType,
      level: CardLevel.REGULAR,
      cardNumber: this.encrypt(cardNumber),
      cardNumberLast4: cardNumber.slice(-4),
      expiryDate,
      cvv: this.encrypt(cvv),
      balance: cardType.minDeposit,
      availableBalance: cardType.minDeposit,
      monthlyLimit: this.CARD_LEVELS.regular.monthlyLimit,
      monthlyUsed: 0,
      status: CardStatus.ACTIVE,
      bindings: [],
    });

    await this.cardRepository.save(card);

    return {
      messageId: MSG.CARD_APPLY_SUCCESS,
      card: {
        id: card.id,
        type: card.type,
        cardNumber: this.maskCardNumber(cardNumber),
        expiryDate: card.expiryDate,
        balance: card.balance,
      },
    };
  }

  async getCardDetail(userId: string, cardId: string) {
    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
      relations: ['provider', 'product'],
    });

    if (!card) {
      throw new NotFoundException(MSG.CARD_NOT_FOUND);
    }

    return {
      ...card,
      cardNumber: card.cardNumberLast4
        ? `**** **** **** ${card.cardNumberLast4}`
        : this.maskCardNumber(this.decrypt(card.cardNumber)),
      cvv: '***',
    };
  }

  async getCvv(userId: string, cardId: string, paymentPassword: string) {
    return this.getCardSensitiveInfo(userId, cardId, paymentPassword);
  }

  async rechargeCard(userId: string, cardId: string, dto: RechargeCardDto) {
    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
      relations: ['provider', 'product'],
    });

    if (!card) {
      throw new NotFoundException(MSG.CARD_NOT_FOUND);
    }

    // 新版卡使用 V2 方法
    if (card.providerCardId && card.provider) {
      await this.rechargeCardV2(userId, cardId, dto);
      return {
        messageId: MSG.CARD_RECHARGE_SUCCESS,
        cardBalance: card.balance,
      };
    }

    // 旧版充值逻辑
    return this.rechargeCardLegacy(userId, cardId, dto);
  }

  private async rechargeCardLegacy(userId: string, cardId: string, dto: RechargeCardDto) {
    // Verify payment password
    await this.userService.verifyPaymentPassword(userId, dto.paymentPassword);

    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
    });

    if (!card) {
      throw new NotFoundException(MSG.CARD_NOT_FOUND);
    }

    if (card.status !== CardStatus.ACTIVE) {
      throw new BadRequestException(MSG.CARD_STATUS_ABNORMAL);
    }

    const fee = dto.amount * (this.CARD_TYPES[card.type]?.rechargeRate || 0.018);
    const totalCost = dto.amount + fee;

    // Check wallet balance
    const wallet = await this.walletService.getWalletByUserId(userId);
    if (Number(wallet.balance) < totalCost) {
      throw new BadRequestException(MSG.WALLET_BALANCE_INSUFFICIENT);
    }

    // Deduct from wallet
    await this.walletService.updateBalance(userId, -totalCost);

    // Add to card balance
    card.balance = Number(card.balance) + dto.amount;
    card.availableBalance = Number(card.availableBalance) + dto.amount;
    await this.cardRepository.save(card);

    // Create recharge record
    const recharge = this.cardRechargeRepository.create({
      userId,
      cardId,
      amount: dto.amount,
      fee,
      status: CardRechargeStatus.COMPLETED,
      completedAt: new Date(),
    });
    await this.cardRechargeRepository.save(recharge);

    return {
      messageId: MSG.CARD_RECHARGE_SUCCESS,
      cardBalance: card.balance,
    };
  }

  async freezeCard(userId: string, cardId: string) {
    return this.updateCardStatus(userId, cardId, { status: 'frozen', reason: 'User requested freeze' });
  }

  async unfreezeCard(userId: string, cardId: string) {
    return this.updateCardStatus(userId, cardId, { status: 'active', reason: 'User requested unfreeze' });
  }

  async upgradeCard(userId: string, cardId: string, dto: UpgradeCardDto) {
    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
    });

    if (!card) {
      throw new NotFoundException(MSG.CARD_NOT_FOUND);
    }

    const targetLevel = this.CARD_LEVELS[dto.targetLevel];
    if (!targetLevel) {
      throw new BadRequestException(MSG.CARD_LEVEL_INVALID);
    }

    const upgradeFee = targetLevel.upgradeFee;

    // Check wallet balance
    const wallet = await this.walletService.getWalletByUserId(userId);
    if (Number(wallet.balance) < upgradeFee) {
      throw new BadRequestException(MSG.WALLET_BALANCE_INSUFFICIENT);
    }

    // Deduct fee
    await this.walletService.updateBalance(userId, -upgradeFee);

    // Upgrade card
    card.level = dto.targetLevel as CardLevel;
    card.monthlyLimit = targetLevel.monthlyLimit;
    await this.cardRepository.save(card);

    return { messageId: MSG.CARD_UPGRADE_SUCCESS };
  }

  // ============ Helper Methods ============

  private generateCardNumber(): string {
    const prefix = '4532'; // Visa prefix
    let number = prefix;
    for (let i = 0; i < 12; i++) {
      number += Math.floor(Math.random() * 10);
    }
    return number;
  }

  private generateExpiryDate(): string {
    const now = new Date();
    const expiryYear = now.getFullYear() + 2;
    const expiryMonth = String(now.getMonth() + 1).padStart(2, '0');
    return `${expiryMonth}/${String(expiryYear).slice(-2)}`;
  }

  private generateCvv(): string {
    return String(Math.floor(Math.random() * 900) + 100);
  }

  private maskCardNumber(cardNumber: string): string {
    if (cardNumber.length < 8) return cardNumber;
    return `${cardNumber.slice(0, 4)} **** **** ${cardNumber.slice(-4)}`;
  }

  private encrypt(text: string): string {
    const key = process.env.ENCRYPTION_KEY || 'mupay-aes-encryption-key-dev-32c';
    const cipher = crypto.createCipheriv('aes-256-ecb', key.slice(0, 32), null);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decrypt(encrypted: string): string {
    try {
      const key = process.env.ENCRYPTION_KEY || 'mupay-aes-encryption-key-dev-32c';
      const decipher = crypto.createDecipheriv('aes-256-ecb', key.slice(0, 32), null);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return encrypted; // Return as-is if decryption fails
    }
  }

  private mapProviderStatus(status: string): CardStatus {
    switch (status) {
      case 'active':
        return CardStatus.ACTIVE;
      case 'frozen':
        return CardStatus.FROZEN;
      case 'cancelled':
        return CardStatus.CANCELLED;
      case 'expired':
        return CardStatus.EXPIRED;
      default:
        return CardStatus.PENDING;
    }
  }

  private mapStatusFromDto(status: 'active' | 'frozen' | 'cancelled'): CardStatus {
    switch (status) {
      case 'active':
        return CardStatus.ACTIVE;
      case 'frozen':
        return CardStatus.FROZEN;
      case 'cancelled':
        return CardStatus.CANCELLED;
    }
  }

  private mapTransactionType(type: string): CardTransactionType {
    switch (type) {
      case 'purchase':
        return CardTransactionType.PURCHASE;
      case 'refund':
        return CardTransactionType.REFUND;
      case 'atm':
        return CardTransactionType.ATM;
      case 'fee':
        return CardTransactionType.FEE;
      case 'adjustment':
        return CardTransactionType.ADJUSTMENT;
      case 'reversal':
        return CardTransactionType.REVERSAL;
      default:
        return CardTransactionType.AUTHORIZATION;
    }
  }

  private mapTransactionStatus(status: string): CardTransactionStatus {
    switch (status) {
      case 'completed':
        return CardTransactionStatus.COMPLETED;
      case 'declined':
        return CardTransactionStatus.DECLINED;
      case 'reversed':
        return CardTransactionStatus.REVERSED;
      default:
        return CardTransactionStatus.PENDING;
    }
  }
}
