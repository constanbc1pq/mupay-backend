import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Card, CardStatus } from '@database/entities/card.entity';
import { CardProvider, CardProviderStatus } from '@database/entities/card-provider.entity';
import { CardTransaction, CardTransactionType, CardTransactionStatus } from '@database/entities/card-transaction.entity';
import { IssuingBalance, IssuingBalanceStatus } from '@database/entities/issuing-balance.entity';
import { IssuingBalanceTransaction } from '@database/entities/issuing-balance-transaction.entity';
import { CardProviderManagerService } from './card-provider-manager.service';

/**
 * 卡片数据同步服务
 * 负责与服务商同步卡片、交易、发行余额等数据
 */
@Injectable()
export class CardSyncService {
  private readonly logger = new Logger(CardSyncService.name);

  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(CardProvider)
    private readonly providerRepository: Repository<CardProvider>,
    @InjectRepository(CardTransaction)
    private readonly transactionRepository: Repository<CardTransaction>,
    @InjectRepository(IssuingBalance)
    private readonly balanceRepository: Repository<IssuingBalance>,
    @InjectRepository(IssuingBalanceTransaction)
    private readonly balanceTransactionRepository: Repository<IssuingBalanceTransaction>,
    private readonly providerManager: CardProviderManagerService,
  ) {}

  /**
   * 同步所有活跃卡片状态
   * @returns 同步的卡片数量
   */
  async syncAllCardStatus(): Promise<number> {
    const providers = await this.providerRepository.find({
      where: { status: CardProviderStatus.ACTIVE },
    });

    let totalSynced = 0;

    for (const provider of providers) {
      try {
        const synced = await this.syncProviderCards(provider);
        totalSynced += synced;
      } catch (error) {
        this.logger.error(`Failed to sync cards for provider ${provider.code}: ${error.message}`);
      }
    }

    return totalSynced;
  }

  /**
   * 同步指定服务商的所有卡片
   */
  async syncProviderCards(provider: CardProvider): Promise<number> {
    const providerAdapter = this.providerManager.getProvider(provider.code);
    if (!providerAdapter) {
      this.logger.warn(`Provider adapter not found for ${provider.code}`);
      return 0;
    }

    // 获取需要同步的卡片 (活跃状态且有 providerCardId)
    const cards = await this.cardRepository.find({
      where: {
        providerId: provider.id,
        status: In([CardStatus.ACTIVE, CardStatus.PENDING, CardStatus.FROZEN]),
        providerCardId: In([...Array(100)].map(() => '')), // Non-empty check workaround
      },
    });

    // 实际获取有 providerCardId 的卡片
    const cardsToSync = await this.cardRepository
      .createQueryBuilder('card')
      .where('card.providerId = :providerId', { providerId: provider.id })
      .andWhere('card.providerCardId IS NOT NULL')
      .andWhere('card.providerCardId != :empty', { empty: '' })
      .andWhere('card.status IN (:...statuses)', { statuses: [CardStatus.ACTIVE, CardStatus.PENDING, CardStatus.FROZEN] })
      .getMany();

    let syncedCount = 0;

    for (const card of cardsToSync) {
      try {
        const response = await providerAdapter.retrieveCard(card.providerCardId);

        if (response.success && response.data) {
          const cardInfo = response.data;

          // 检查是否有变化
          const hasChanges =
            card.balance !== cardInfo.balance ||
            card.availableBalance !== cardInfo.availableBalance ||
            card.status !== this.mapProviderStatus(cardInfo.status) ||
            card.dailyUsed !== cardInfo.dailyUsed ||
            card.monthlyUsed !== cardInfo.monthlyUsed;

          if (hasChanges) {
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
            syncedCount++;

            this.logger.debug(`Synced card ${card.id}: balance=${cardInfo.balance}, status=${cardInfo.status}`);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to sync card ${card.id}: ${error.message}`);
      }
    }

    if (syncedCount > 0) {
      this.logger.log(`Synced ${syncedCount} cards for provider ${provider.code}`);
    }

    return syncedCount;
  }

  /**
   * 同步卡片交易记录
   * @returns 新增的交易记录数量
   */
  async syncAllTransactions(): Promise<number> {
    const providers = await this.providerRepository.find({
      where: { status: CardProviderStatus.ACTIVE },
    });

    let totalSynced = 0;

    for (const provider of providers) {
      try {
        const synced = await this.syncProviderTransactions(provider);
        totalSynced += synced;
      } catch (error) {
        this.logger.error(`Failed to sync transactions for provider ${provider.code}: ${error.message}`);
      }
    }

    return totalSynced;
  }

  /**
   * 同步指定服务商的交易记录
   */
  async syncProviderTransactions(provider: CardProvider): Promise<number> {
    const providerAdapter = this.providerManager.getProvider(provider.code);
    if (!providerAdapter) {
      return 0;
    }

    // 获取最后同步的交易时间
    const lastTransaction = await this.transactionRepository.findOne({
      where: { providerId: provider.id },
      order: { transactionTime: 'DESC' },
    });

    const startTime = lastTransaction?.transactionTime
      ? new Date(lastTransaction.transactionTime.getTime() - 60000).toISOString() // 1分钟重叠避免遗漏
      : undefined;

    // 从服务商获取交易
    const response = await providerAdapter.listCardTransactions({
      startTime,
      pageSize: 100,
    });

    if (!response.success || !response.data) {
      return 0;
    }

    let syncedCount = 0;

    for (const txInfo of response.data.items) {
      // 检查是否已存在
      const existing = await this.transactionRepository.findOne({
        where: { providerTransactionId: txInfo.providerTransactionId },
      });

      if (existing) {
        // 更新状态
        if (existing.status !== this.mapTransactionStatus(txInfo.status)) {
          existing.status = this.mapTransactionStatus(txInfo.status);
          if (txInfo.declineReason !== undefined) {
            existing.declineReason = txInfo.declineReason;
          }
          if (txInfo.cardBalanceAfter !== undefined) {
            existing.cardBalanceAfter = txInfo.cardBalanceAfter;
          }
          await this.transactionRepository.save(existing);
        }
        continue;
      }

      // 查找对应的本地卡片
      const card = await this.cardRepository.findOne({
        where: { providerCardId: txInfo.cardId, providerId: provider.id },
      });

      if (!card) {
        this.logger.warn(`Card not found for provider card ID: ${txInfo.cardId}`);
        continue;
      }

      // 创建新交易记录
      const transactionData: any = {
        cardId: card.id,
        providerId: provider.id,
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
        transactionData.declineReason = txInfo.declineReason;
      }
      if (txInfo.cardBalanceAfter !== undefined) {
        transactionData.cardBalanceAfter = txInfo.cardBalanceAfter;
      }
      if (txInfo.postedTime) {
        transactionData.postedTime = new Date(txInfo.postedTime);
      }
      if (txInfo.metadata) {
        transactionData.providerMetadata = txInfo.metadata;
      }

      const transaction = this.transactionRepository.create(transactionData);

      await this.transactionRepository.save(transaction);
      syncedCount++;
    }

    if (syncedCount > 0) {
      this.logger.log(`Synced ${syncedCount} transactions for provider ${provider.code}`);
    }

    return syncedCount;
  }

  /**
   * 同步发行余额
   */
  async syncAllIssuingBalances(): Promise<number> {
    const providers = await this.providerRepository.find({
      where: { status: CardProviderStatus.ACTIVE },
    });

    let totalSynced = 0;

    for (const provider of providers) {
      try {
        const synced = await this.syncProviderBalance(provider);
        totalSynced += synced;
      } catch (error) {
        this.logger.error(`Failed to sync balance for provider ${provider.code}: ${error.message}`);
      }
    }

    return totalSynced;
  }

  /**
   * 同步指定服务商的发行余额
   */
  async syncProviderBalance(provider: CardProvider): Promise<number> {
    const providerAdapter = this.providerManager.getProvider(provider.code);
    if (!providerAdapter) {
      return 0;
    }

    const response = await providerAdapter.retrieveIssuingBalance();

    if (!response.success || !response.data) {
      return 0;
    }

    let syncedCount = 0;

    for (const balanceInfo of response.data) {
      // 查找或创建本地余额记录
      let balance = await this.balanceRepository.findOne({
        where: { providerId: provider.id, currency: balanceInfo.currency },
      });

      const hasChanges = !balance ||
        balance.availableBalance !== balanceInfo.availableBalance ||
        balance.frozenBalance !== balanceInfo.frozenBalance;

      if (!balance) {
        balance = this.balanceRepository.create({
          providerId: provider.id,
          providerBalanceId: balanceInfo.balanceId,
          currency: balanceInfo.currency,
          availableBalance: balanceInfo.availableBalance,
          frozenBalance: balanceInfo.frozenBalance,
          marginBalance: balanceInfo.marginBalance || 0,
          totalBalance: balanceInfo.totalBalance,
          status: this.mapBalanceStatus(balanceInfo.status),
          lastSyncAt: new Date(),
        });
      } else if (hasChanges) {
        balance.availableBalance = balanceInfo.availableBalance;
        balance.frozenBalance = balanceInfo.frozenBalance;
        balance.marginBalance = balanceInfo.marginBalance || 0;
        balance.totalBalance = balanceInfo.totalBalance;
        balance.status = this.mapBalanceStatus(balanceInfo.status);
        balance.lastSyncAt = new Date();
      }

      if (hasChanges) {
        await this.balanceRepository.save(balance);
        syncedCount++;

        this.logger.debug(
          `Synced balance for ${provider.code} ${balanceInfo.currency}: available=${balanceInfo.availableBalance}`,
        );
      }
    }

    if (syncedCount > 0) {
      this.logger.log(`Synced ${syncedCount} balances for provider ${provider.code}`);
    }

    return syncedCount;
  }

  /**
   * 同步单张卡片
   */
  async syncSingleCard(cardId: string): Promise<boolean> {
    const card = await this.cardRepository.findOne({
      where: { id: cardId },
      relations: ['provider'],
    });

    if (!card || !card.providerCardId || !card.provider) {
      return false;
    }

    const providerAdapter = this.providerManager.getProvider(card.provider.code);
    if (!providerAdapter) {
      return false;
    }

    try {
      const response = await providerAdapter.retrieveCard(card.providerCardId);

      if (response.success && response.data) {
        const cardInfo = response.data;
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
        return true;
      }
    } catch (error) {
      this.logger.error(`Failed to sync single card ${cardId}: ${error.message}`);
    }

    return false;
  }

  // ============ Helper Methods ============

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

  private mapBalanceStatus(status: string): IssuingBalanceStatus {
    switch (status) {
      case 'active':
        return IssuingBalanceStatus.ACTIVE;
      default:
        return IssuingBalanceStatus.INACTIVE;
    }
  }
}
