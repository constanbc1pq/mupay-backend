import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Card, CardStatus } from '@database/entities/card.entity';
import { CardProvider, CardProviderStatus } from '@database/entities/card-provider.entity';
import { CardTransaction, CardTransactionType, CardTransactionStatus } from '@database/entities/card-transaction.entity';
import { CardRecharge, CardRechargeStatus } from '@database/entities/card-recharge.entity';
import { CardSyncService } from '@services/card-provider/card-sync.service';

/**
 * Webhook 事件类型
 */
export enum WebhookEventType {
  // 卡片事件
  CARD_CREATED = 'card.created',
  CARD_ACTIVATED = 'card.activated',
  CARD_FROZEN = 'card.frozen',
  CARD_UNFROZEN = 'card.unfrozen',
  CARD_CANCELLED = 'card.cancelled',
  CARD_STATUS_CHANGED = 'card.status_changed',

  // 交易事件
  TRANSACTION_CREATED = 'transaction.created',
  TRANSACTION_COMPLETED = 'transaction.completed',
  TRANSACTION_DECLINED = 'transaction.declined',
  TRANSACTION_REVERSED = 'transaction.reversed',

  // 充值/提现事件
  RECHARGE_COMPLETED = 'recharge.completed',
  RECHARGE_FAILED = 'recharge.failed',
  WITHDRAW_COMPLETED = 'withdraw.completed',
  WITHDRAW_FAILED = 'withdraw.failed',

  // 持卡人事件
  CARDHOLDER_KYC_APPROVED = 'cardholder.kyc_approved',
  CARDHOLDER_KYC_REJECTED = 'cardholder.kyc_rejected',

  // 余额事件
  BALANCE_LOW = 'balance.low',
  BALANCE_UPDATED = 'balance.updated',
}

/**
 * 卡 Webhook 处理服务
 */
@Injectable()
export class CardWebhookService {
  private readonly logger = new Logger(CardWebhookService.name);

  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(CardProvider)
    private readonly providerRepository: Repository<CardProvider>,
    @InjectRepository(CardTransaction)
    private readonly transactionRepository: Repository<CardTransaction>,
    @InjectRepository(CardRecharge)
    private readonly rechargeRepository: Repository<CardRecharge>,
    private readonly cardSyncService: CardSyncService,
  ) {}

  /**
   * 验证 Webhook 签名
   */
  async verifySignature(
    providerCode: string,
    rawBody: string,
    signature: string,
    timestamp: string,
  ): Promise<boolean> {
    // 如果没有签名，跳过验证 (开发环境)
    if (!signature) {
      this.logger.warn('No signature provided, skipping verification');
      return process.env.NODE_ENV === 'development';
    }

    // 获取服务商配置
    const provider = await this.providerRepository.findOne({
      where: { code: providerCode },
    });

    if (!provider || !provider.webhookSecret) {
      this.logger.warn(`Provider ${providerCode} not found or no webhook secret configured`);
      return false;
    }

    // 验证时间戳 (5分钟内有效)
    const eventTime = parseInt(timestamp, 10);
    const now = Date.now();
    if (Math.abs(now - eventTime) > 5 * 60 * 1000) {
      this.logger.warn('Webhook timestamp expired');
      return false;
    }

    // 计算签名
    const payload = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', provider.webhookSecret)
      .update(payload)
      .digest('hex');

    // 比较签名
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * 处理 Webhook 事件
   */
  async handleEvent(providerCode: string, event: any): Promise<void> {
    const eventType = event.event_type || event.type || event.eventType;
    const eventId = event.event_id || event.id || event.eventId;

    this.logger.log(`Processing webhook event: ${eventType} (${eventId}) from ${providerCode}`);

    try {
      switch (eventType) {
        // 卡片状态事件
        case WebhookEventType.CARD_ACTIVATED:
        case WebhookEventType.CARD_FROZEN:
        case WebhookEventType.CARD_UNFROZEN:
        case WebhookEventType.CARD_CANCELLED:
        case WebhookEventType.CARD_STATUS_CHANGED:
        case 'card.activated':
        case 'card.frozen':
        case 'card.unfrozen':
        case 'card.cancelled':
        case 'card.status_changed':
          await this.handleCardStatusChange(providerCode, event);
          break;

        // 交易事件
        case WebhookEventType.TRANSACTION_CREATED:
        case WebhookEventType.TRANSACTION_COMPLETED:
        case WebhookEventType.TRANSACTION_DECLINED:
        case WebhookEventType.TRANSACTION_REVERSED:
        case 'transaction.created':
        case 'transaction.completed':
        case 'transaction.declined':
        case 'transaction.reversed':
          await this.handleTransaction(providerCode, event);
          break;

        // 充值完成事件
        case WebhookEventType.RECHARGE_COMPLETED:
        case WebhookEventType.RECHARGE_FAILED:
        case 'recharge.completed':
        case 'recharge.failed':
          await this.handleRechargeResult(providerCode, event);
          break;

        // 提现完成事件
        case WebhookEventType.WITHDRAW_COMPLETED:
        case WebhookEventType.WITHDRAW_FAILED:
        case 'withdraw.completed':
        case 'withdraw.failed':
          await this.handleWithdrawResult(providerCode, event);
          break;

        // 余额预警
        case WebhookEventType.BALANCE_LOW:
        case 'balance.low':
          await this.handleBalanceAlert(providerCode, event);
          break;

        default:
          this.logger.warn(`Unknown webhook event type: ${eventType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle webhook event: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 处理卡状态变更事件
   */
  private async handleCardStatusChange(providerCode: string, event: any): Promise<void> {
    const data = event.data || event;
    const providerCardId = data.card_id || data.cardId;
    const newStatus = data.status;

    if (!providerCardId) {
      this.logger.warn('Card ID missing in webhook event');
      return;
    }

    // 查找本地卡片
    const provider = await this.providerRepository.findOne({
      where: { code: providerCode },
    });

    if (!provider) {
      this.logger.warn(`Provider ${providerCode} not found`);
      return;
    }

    const card = await this.cardRepository.findOne({
      where: { providerCardId, providerId: provider.id },
    });

    if (!card) {
      this.logger.warn(`Card not found for provider card ID: ${providerCardId}`);
      return;
    }

    // 更新卡状态
    const oldStatus = card.status;
    card.status = this.mapCardStatus(newStatus);
    card.statusReason = data.reason || data.status_reason;
    card.lastSyncAt = new Date();

    if (data.balance !== undefined) {
      card.balance = data.balance;
      card.availableBalance = data.available_balance || data.balance;
    }

    await this.cardRepository.save(card);

    this.logger.log(`Card ${card.id} status changed: ${oldStatus} -> ${card.status}`);

    // 触发同步以获取最新数据
    await this.cardSyncService.syncSingleCard(card.id);
  }

  /**
   * 处理交易事件
   */
  private async handleTransaction(providerCode: string, event: any): Promise<void> {
    const data = event.data || event;
    const providerTransactionId = data.transaction_id || data.transactionId;
    const providerCardId = data.card_id || data.cardId;

    if (!providerTransactionId) {
      this.logger.warn('Transaction ID missing in webhook event');
      return;
    }

    // 获取服务商
    const provider = await this.providerRepository.findOne({
      where: { code: providerCode },
    });

    if (!provider) {
      return;
    }

    // 检查交易是否已存在
    let transaction = await this.transactionRepository.findOne({
      where: { providerTransactionId },
    });

    if (transaction) {
      // 更新已存在的交易状态
      transaction.status = this.mapTransactionStatus(data.status);
      transaction.declineReason = data.decline_reason || data.declineReason;
      transaction.cardBalanceAfter = data.card_balance_after || data.cardBalanceAfter;

      if (data.posted_time || data.postedTime) {
        transaction.postedTime = new Date(data.posted_time || data.postedTime);
      }

      await this.transactionRepository.save(transaction);
      this.logger.log(`Transaction ${providerTransactionId} status updated: ${transaction.status}`);
    } else {
      // 查找对应的卡片
      const card = await this.cardRepository.findOne({
        where: { providerCardId, providerId: provider.id },
      });

      if (!card) {
        this.logger.warn(`Card not found for transaction: ${providerCardId}`);
        return;
      }

      // 创建新交易记录
      transaction = this.transactionRepository.create({
        cardId: card.id,
        providerId: provider.id,
        providerTransactionId,
        shortTransactionId: data.short_transaction_id || data.shortTransactionId,
        type: this.mapTransactionType(data.transaction_type || data.type),
        amount: data.amount || data.transaction_amount,
        currency: data.currency || data.transaction_currency,
        billingAmount: data.billing_amount,
        billingCurrency: data.billing_currency,
        fee: data.fee || data.transaction_fee || 0,
        feeCurrency: data.fee_currency,
        merchantName: data.merchant_name || data.merchant_data?.name,
        merchantCategory: data.merchant_category || data.merchant_data?.category,
        merchantCity: data.merchant_city || data.merchant_data?.city,
        merchantCountry: data.merchant_country || data.merchant_data?.country,
        status: this.mapTransactionStatus(data.status || data.transaction_status),
        declineReason: data.decline_reason || data.declineReason,
        cardBalanceAfter: data.card_balance_after || data.cardBalanceAfter,
        transactionTime: new Date(data.transaction_time || data.created_at || new Date()),
        providerMetadata: data,
      });

      await this.transactionRepository.save(transaction);
      this.logger.log(`New transaction created: ${providerTransactionId}`);
    }

    // 更新卡片余额
    if (providerCardId && data.card_balance_after !== undefined) {
      const card = await this.cardRepository.findOne({
        where: { providerCardId, providerId: provider.id },
      });

      if (card) {
        card.availableBalance = data.card_balance_after;
        card.lastSyncAt = new Date();
        await this.cardRepository.save(card);
      }
    }
  }

  /**
   * 处理充值结果事件
   */
  private async handleRechargeResult(providerCode: string, event: any): Promise<void> {
    const data = event.data || event;
    const orderId = data.order_id || data.orderId;
    const providerCardId = data.card_id || data.cardId;
    const status = data.status;

    this.logger.log(`Recharge result: ${orderId} - ${status}`);

    // 更新卡片余额
    if (providerCardId) {
      const provider = await this.providerRepository.findOne({
        where: { code: providerCode },
      });

      if (provider) {
        const card = await this.cardRepository.findOne({
          where: { providerCardId, providerId: provider.id },
        });

        if (card && data.new_balance !== undefined) {
          card.balance = data.new_balance;
          card.availableBalance = data.new_balance;
          card.lastSyncAt = new Date();
          await this.cardRepository.save(card);
        }
      }
    }
  }

  /**
   * 处理提现结果事件
   */
  private async handleWithdrawResult(providerCode: string, event: any): Promise<void> {
    const data = event.data || event;
    const orderId = data.order_id || data.orderId;
    const status = data.status;

    this.logger.log(`Withdraw result: ${orderId} - ${status}`);

    // 提现结果处理逻辑
    // 如果失败，可能需要回滚钱包余额
  }

  /**
   * 处理余额预警事件
   */
  private async handleBalanceAlert(providerCode: string, event: any): Promise<void> {
    const data = event.data || event;
    const currency = data.currency;
    const currentBalance = data.balance || data.available_balance;
    const threshold = data.threshold;

    this.logger.warn(
      `Balance alert from ${providerCode}: ${currency} balance ${currentBalance} below threshold ${threshold}`,
    );

    // TODO: 发送预警通知给管理员
  }

  // ============ Helper Methods ============

  private mapCardStatus(status: string): CardStatus {
    switch (status?.toLowerCase()) {
      case 'active':
        return CardStatus.ACTIVE;
      case 'frozen':
      case 'suspended':
        return CardStatus.FROZEN;
      case 'cancelled':
      case 'closed':
        return CardStatus.CANCELLED;
      case 'expired':
        return CardStatus.EXPIRED;
      default:
        return CardStatus.PENDING;
    }
  }

  private mapTransactionType(type: string): CardTransactionType {
    switch (type?.toLowerCase()) {
      case 'purchase':
      case 'debit':
        return CardTransactionType.PURCHASE;
      case 'refund':
      case 'credit':
        return CardTransactionType.REFUND;
      case 'atm':
      case 'withdrawal':
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
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'settled':
      case 'posted':
        return CardTransactionStatus.COMPLETED;
      case 'declined':
      case 'failed':
      case 'rejected':
        return CardTransactionStatus.DECLINED;
      case 'reversed':
      case 'refunded':
        return CardTransactionStatus.REVERSED;
      default:
        return CardTransactionStatus.PENDING;
    }
  }
}
