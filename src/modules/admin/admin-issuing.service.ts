import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { CardProvider, CardProviderStatus } from '@database/entities/card-provider.entity';
import { CardProduct } from '@database/entities/card-product.entity';
import { IssuingBalance } from '@database/entities/issuing-balance.entity';
import { IssuingBalanceTransaction, IssuingBalanceTransactionType } from '@database/entities/issuing-balance-transaction.entity';
import { Card } from '@database/entities/card.entity';
import { CardProviderManagerService } from '@services/card-provider/card-provider-manager.service';
import { CardSyncService } from '@services/card-provider/card-sync.service';
import {
  AdminProviderQueryDto,
  UpdateProviderDto,
  AdminBalanceQueryDto,
  AdminBalanceTransactionQueryDto,
  UpdateBalanceAlertDto,
} from './dto/admin-issuing.dto';

/**
 * 服务商详情响应
 */
export interface ProviderDetailResponse {
  id: string;
  code: string;
  name: string;
  status: CardProviderStatus;
  apiBaseUrl: string;
  openFeeRate: number;
  rechargeFeeRate: number;
  withdrawFeeRate: number;
  monthlyFeeRate: number;
  minRecharge: number;
  maxRecharge: number;
  minWithdraw: number;
  maxWithdraw: number;
  supportedCardForms: string[];
  supportedCardModes: string[];
  priority: number;
  isHealthy: boolean;
  lastHealthCheckAt: Date;
  productCount: number;
  cardCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 余额汇总响应
 */
export interface BalanceSummaryResponse {
  providerId: string;
  providerCode: string;
  providerName: string;
  balances: {
    currency: string;
    availableBalance: number;
    frozenBalance: number;
    marginBalance: number;
    totalBalance: number;
    alertThreshold: number;
    alertEnabled: boolean;
    isLow: boolean;
    lastSyncAt: Date;
  }[];
  totalUsdValue: number;
}

@Injectable()
export class AdminIssuingService {
  private readonly logger = new Logger(AdminIssuingService.name);

  constructor(
    @InjectRepository(CardProvider)
    private readonly providerRepository: Repository<CardProvider>,
    @InjectRepository(CardProduct)
    private readonly productRepository: Repository<CardProduct>,
    @InjectRepository(IssuingBalance)
    private readonly balanceRepository: Repository<IssuingBalance>,
    @InjectRepository(IssuingBalanceTransaction)
    private readonly balanceTransactionRepository: Repository<IssuingBalanceTransaction>,
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    private readonly providerManager: CardProviderManagerService,
    private readonly cardSyncService: CardSyncService,
  ) {}

  // ============ 服务商管理 ============

  /**
   * 获取服务商列表
   */
  async getProviders(query: AdminProviderQueryDto): Promise<{
    items: ProviderDetailResponse[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page = 1, pageSize = 20, status } = query;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [providers, total] = await this.providerRepository.findAndCount({
      where,
      order: { priority: 'ASC', createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const items = await Promise.all(
      providers.map(async (provider) => {
        const productCount = await this.productRepository.count({
          where: { providerId: provider.id },
        });
        const cardCount = await this.cardRepository.count({
          where: { providerId: provider.id },
        });

        // 获取运行时状态
        const runtimeStatus = this.providerManager.getProviderStatus(provider.code);

        return {
          id: provider.id,
          code: provider.code,
          name: provider.name,
          status: provider.status,
          apiBaseUrl: provider.apiBaseUrl,
          openFeeRate: Number(provider.openFeeRate),
          rechargeFeeRate: Number(provider.rechargeFeeRate),
          withdrawFeeRate: Number(provider.withdrawFeeRate),
          monthlyFeeRate: Number(provider.monthlyFeeRate),
          minRecharge: Number(provider.minRecharge),
          maxRecharge: Number(provider.maxRecharge),
          minWithdraw: Number(provider.minWithdraw),
          maxWithdraw: Number(provider.maxWithdraw),
          supportedCardForms: provider.supportedCardForms || [],
          supportedCardModes: provider.supportedCardModes || [],
          priority: provider.priority,
          isHealthy: runtimeStatus?.healthy ?? provider.isHealthy,
          lastHealthCheckAt: runtimeStatus?.lastHealthCheck || provider.lastHealthCheckAt,
          productCount,
          cardCount,
          createdAt: provider.createdAt,
          updatedAt: provider.updatedAt,
        };
      }),
    );

    return { items, total, page, pageSize };
  }

  /**
   * 获取服务商详情
   */
  async getProviderDetail(providerId: string): Promise<ProviderDetailResponse & {
    products: any[];
    balances: any[];
    recentActivity: {
      totalCards: number;
      activeCards: number;
      todayTransactions: number;
      todayVolume: number;
    };
  }> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // 获取产品列表
    const products = await this.productRepository.find({
      where: { providerId },
      order: { sortOrder: 'ASC' },
    });

    // 获取余额列表
    const balances = await this.balanceRepository.find({
      where: { providerId },
    });

    // 获取统计数据
    const totalCards = await this.cardRepository.count({
      where: { providerId },
    });

    const activeCards = await this.cardRepository.count({
      where: { providerId, status: 'active' as any },
    });

    // 获取今日交易数据
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTransactionsResult = await this.balanceTransactionRepository
      .createQueryBuilder('tx')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(ABS(tx.amount))', 'volume')
      .where('tx.providerId = :providerId', { providerId })
      .andWhere('tx.transactionTime >= :today', { today })
      .getRawOne();

    const productCount = products.length;
    const cardCount = totalCards;

    const runtimeStatus = this.providerManager.getProviderStatus(provider.code);

    return {
      id: provider.id,
      code: provider.code,
      name: provider.name,
      status: provider.status,
      apiBaseUrl: provider.apiBaseUrl,
      openFeeRate: Number(provider.openFeeRate),
      rechargeFeeRate: Number(provider.rechargeFeeRate),
      withdrawFeeRate: Number(provider.withdrawFeeRate),
      monthlyFeeRate: Number(provider.monthlyFeeRate),
      minRecharge: Number(provider.minRecharge),
      maxRecharge: Number(provider.maxRecharge),
      minWithdraw: Number(provider.minWithdraw),
      maxWithdraw: Number(provider.maxWithdraw),
      supportedCardForms: provider.supportedCardForms || [],
      supportedCardModes: provider.supportedCardModes || [],
      priority: provider.priority,
      isHealthy: runtimeStatus?.healthy ?? provider.isHealthy,
      lastHealthCheckAt: runtimeStatus?.lastHealthCheck || provider.lastHealthCheckAt,
      productCount,
      cardCount,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        cardForm: p.cardForm,
        cardMode: p.cardMode,
        cardBrand: p.cardBrand,
        currencies: p.currencies,
        openFee: Number(p.openFee),
        status: p.status,
      })),
      balances: balances.map((b) => ({
        id: b.id,
        currency: b.currency,
        availableBalance: Number(b.availableBalance),
        frozenBalance: Number(b.frozenBalance),
        totalBalance: Number(b.totalBalance),
        alertThreshold: Number(b.alertThreshold),
        alertEnabled: b.alertEnabled,
        lastSyncAt: b.lastSyncAt,
      })),
      recentActivity: {
        totalCards,
        activeCards,
        todayTransactions: parseInt(todayTransactionsResult?.count || '0', 10),
        todayVolume: parseFloat(todayTransactionsResult?.volume || '0'),
      },
    };
  }

  /**
   * 更新服务商配置
   */
  async updateProvider(providerId: string, dto: UpdateProviderDto): Promise<CardProvider> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // 更新字段
    if (dto.name !== undefined) provider.name = dto.name;
    if (dto.status !== undefined) provider.status = dto.status as CardProviderStatus;
    if (dto.apiBaseUrl !== undefined) provider.apiBaseUrl = dto.apiBaseUrl;
    if (dto.apiKey !== undefined) provider.apiKey = dto.apiKey;
    if (dto.apiSecret !== undefined) provider.apiSecret = dto.apiSecret;
    if (dto.webhookSecret !== undefined) provider.webhookSecret = dto.webhookSecret;
    if (dto.openFeeRate !== undefined) provider.openFeeRate = dto.openFeeRate;
    if (dto.rechargeFeeRate !== undefined) provider.rechargeFeeRate = dto.rechargeFeeRate;
    if (dto.withdrawFeeRate !== undefined) provider.withdrawFeeRate = dto.withdrawFeeRate;
    if (dto.minRecharge !== undefined) provider.minRecharge = dto.minRecharge;
    if (dto.maxRecharge !== undefined) provider.maxRecharge = dto.maxRecharge;
    if (dto.priority !== undefined) provider.priority = dto.priority;
    if (dto.isHealthy !== undefined) provider.isHealthy = dto.isHealthy;

    await this.providerRepository.save(provider);

    // 更新运行时状态
    if (dto.status !== undefined) {
      this.providerManager.setProviderEnabled(
        provider.code,
        dto.status === 'active',
      );
    }

    this.logger.log(`Provider ${provider.code} updated`);

    return provider;
  }

  // ============ 发行余额管理 ============

  /**
   * 获取所有服务商的发行余额汇总
   */
  async getBalanceSummary(query: AdminBalanceQueryDto): Promise<BalanceSummaryResponse[]> {
    const { providerId, currency } = query;

    const where: any = {};
    if (providerId) {
      where.providerId = providerId;
    }
    if (currency) {
      where.currency = currency;
    }

    const balances = await this.balanceRepository.find({
      where,
      relations: ['provider'],
      order: { providerId: 'ASC', currency: 'ASC' },
    });

    // 按服务商分组
    const providerMap = new Map<string, BalanceSummaryResponse>();

    for (const balance of balances) {
      if (!providerMap.has(balance.providerId)) {
        providerMap.set(balance.providerId, {
          providerId: balance.providerId,
          providerCode: balance.provider?.code || '',
          providerName: balance.provider?.name || '',
          balances: [],
          totalUsdValue: 0,
        });
      }

      const summary = providerMap.get(balance.providerId)!;
      const isLow =
        balance.alertEnabled &&
        Number(balance.availableBalance) < Number(balance.alertThreshold);

      summary.balances.push({
        currency: balance.currency,
        availableBalance: Number(balance.availableBalance),
        frozenBalance: Number(balance.frozenBalance),
        marginBalance: Number(balance.marginBalance),
        totalBalance: Number(balance.totalBalance),
        alertThreshold: Number(balance.alertThreshold),
        alertEnabled: balance.alertEnabled,
        isLow,
        lastSyncAt: balance.lastSyncAt,
      });

      // 简单的 USD 换算 (实际应该用汇率服务)
      const rate = balance.currency === 'USD' ? 1 : balance.currency === 'EUR' ? 1.1 : 1;
      summary.totalUsdValue += Number(balance.availableBalance) * rate;
    }

    return Array.from(providerMap.values());
  }

  /**
   * 获取指定服务商的余额详情
   */
  async getProviderBalances(providerId: string): Promise<{
    provider: { id: string; code: string; name: string };
    balances: any[];
    lastSync: Date | null;
  }> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const balances = await this.balanceRepository.find({
      where: { providerId },
      order: { currency: 'ASC' },
    });

    const lastSync = balances.length > 0
      ? balances.reduce((latest, b) =>
          b.lastSyncAt && (!latest || b.lastSyncAt > latest) ? b.lastSyncAt : latest,
          null as Date | null,
        )
      : null;

    return {
      provider: {
        id: provider.id,
        code: provider.code,
        name: provider.name,
      },
      balances: balances.map((b) => ({
        id: b.id,
        currency: b.currency,
        availableBalance: Number(b.availableBalance),
        frozenBalance: Number(b.frozenBalance),
        marginBalance: Number(b.marginBalance),
        totalBalance: Number(b.totalBalance),
        alertThreshold: Number(b.alertThreshold),
        alertEnabled: b.alertEnabled,
        isLow: b.alertEnabled && Number(b.availableBalance) < Number(b.alertThreshold),
        lastSyncAt: b.lastSyncAt,
        lastTradeTime: b.lastTradeTime,
      })),
      lastSync,
    };
  }

  /**
   * 获取余额交易记录
   */
  async getBalanceTransactions(
    providerId: string,
    query: AdminBalanceTransactionQueryDto,
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page = 1, pageSize = 20, currency, type, startDate, endDate } = query;

    const where: any = { providerId };

    if (currency) {
      where.currency = currency;
    }

    if (type) {
      where.type = type;
    }

    if (startDate && endDate) {
      where.transactionTime = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      where.transactionTime = MoreThanOrEqual(new Date(startDate));
    } else if (endDate) {
      where.transactionTime = LessThanOrEqual(new Date(endDate));
    }

    const [transactions, total] = await this.balanceTransactionRepository.findAndCount({
      where,
      relations: ['relatedCard', 'relatedUser'],
      order: { transactionTime: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const items = transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      currency: tx.currency,
      endingBalance: Number(tx.endingBalance),
      status: tx.status,
      description: tx.description,
      relatedCardId: tx.relatedCardId,
      relatedUserId: tx.relatedUserId,
      relatedUserEmail: tx.relatedUser?.email,
      transactionTime: tx.transactionTime,
      completedAt: tx.completedAt,
    }));

    return { items, total, page, pageSize };
  }

  /**
   * 更新余额预警配置
   */
  async updateBalanceAlert(
    balanceId: string,
    dto: UpdateBalanceAlertDto,
  ): Promise<IssuingBalance> {
    const balance = await this.balanceRepository.findOne({
      where: { id: balanceId },
    });

    if (!balance) {
      throw new NotFoundException('Balance not found');
    }

    if (dto.alertThreshold !== undefined) {
      balance.alertThreshold = dto.alertThreshold;
    }

    if (dto.alertEnabled !== undefined) {
      balance.alertEnabled = dto.alertEnabled;
    }

    await this.balanceRepository.save(balance);

    this.logger.log(`Balance ${balanceId} alert config updated`);

    return balance;
  }

  // ============ 同步操作 ============

  /**
   * 手动触发服务商数据同步
   */
  async triggerSync(providerId: string): Promise<{
    success: boolean;
    syncedCards: number;
    syncedTransactions: number;
    syncedBalances: number;
  }> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    this.logger.log(`Manual sync triggered for provider ${provider.code}`);

    let syncedCards = 0;
    let syncedTransactions = 0;
    let syncedBalances = 0;

    try {
      // 同步卡片
      syncedCards = await this.cardSyncService.syncProviderCards(provider);

      // 同步交易
      syncedTransactions = await this.cardSyncService.syncProviderTransactions(provider);

      // 同步余额
      syncedBalances = await this.cardSyncService.syncProviderBalance(provider);

      this.logger.log(
        `Sync completed for ${provider.code}: cards=${syncedCards}, transactions=${syncedTransactions}, balances=${syncedBalances}`,
      );

      return {
        success: true,
        syncedCards,
        syncedTransactions,
        syncedBalances,
      };
    } catch (error) {
      this.logger.error(`Sync failed for ${provider.code}: ${error.message}`);
      throw new BadRequestException(`Sync failed: ${error.message}`);
    }
  }

  /**
   * 执行服务商健康检查
   */
  async checkProviderHealth(providerId: string): Promise<{
    healthy: boolean;
    latency: number;
    message: string;
  }> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const startTime = Date.now();

    try {
      const healthy = await this.providerManager.checkProviderHealth(provider.code);
      const latency = Date.now() - startTime;

      // 更新数据库
      provider.isHealthy = healthy;
      provider.lastHealthCheckAt = new Date();
      await this.providerRepository.save(provider);

      return {
        healthy,
        latency,
        message: healthy ? 'Provider is healthy' : 'Provider health check failed',
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      provider.isHealthy = false;
      provider.lastHealthCheckAt = new Date();
      await this.providerRepository.save(provider);

      return {
        healthy: false,
        latency,
        message: `Health check error: ${error.message}`,
      };
    }
  }

  /**
   * 获取发行余额统计
   */
  async getBalanceStats(): Promise<{
    totalProviders: number;
    healthyProviders: number;
    totalUsdBalance: number;
    lowBalanceAlerts: number;
    recentTransactions: number;
  }> {
    const totalProviders = await this.providerRepository.count({
      where: { status: CardProviderStatus.ACTIVE },
    });

    const healthyProviders = await this.providerRepository.count({
      where: { status: CardProviderStatus.ACTIVE, isHealthy: true },
    });

    // 计算总余额 (简化版)
    const balances = await this.balanceRepository.find();
    let totalUsdBalance = 0;
    let lowBalanceAlerts = 0;

    for (const balance of balances) {
      const rate = balance.currency === 'USD' ? 1 : balance.currency === 'EUR' ? 1.1 : 1;
      totalUsdBalance += Number(balance.availableBalance) * rate;

      if (balance.alertEnabled && Number(balance.availableBalance) < Number(balance.alertThreshold)) {
        lowBalanceAlerts++;
      }
    }

    // 最近24小时交易数
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const recentTransactions = await this.balanceTransactionRepository.count({
      where: { transactionTime: MoreThanOrEqual(yesterday) },
    });

    return {
      totalProviders,
      healthyProviders,
      totalUsdBalance,
      lowBalanceAlerts,
      recentTransactions,
    };
  }
}
