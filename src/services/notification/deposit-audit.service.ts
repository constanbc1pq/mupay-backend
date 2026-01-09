import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { DepositAuditLog, AuditAction } from '@database/entities/deposit-audit-log.entity';
import { DepositOrder } from '@database/entities/deposit-order.entity';

interface AuditLogParams {
  orderId?: string;
  userId?: string;
  action: AuditAction;
  method?: 'CRYPTO' | 'CARD' | 'PAYPAL';
  network?: string;
  amount?: number;
  previousStatus?: string;
  newStatus?: string;
  details?: Record<string, unknown>;
  source?: string;
  operatorId?: string;
  ipAddress?: string;
}

@Injectable()
export class DepositAuditService {
  private readonly logger = new Logger(DepositAuditService.name);

  constructor(
    @InjectRepository(DepositAuditLog)
    private auditLogRepo: Repository<DepositAuditLog>,
  ) {}

  /**
   * Create an audit log entry
   */
  async log(params: AuditLogParams): Promise<DepositAuditLog> {
    const log = this.auditLogRepo.create({
      ...params,
      details: params.details ? JSON.stringify(params.details) : null,
    });

    const saved = await this.auditLogRepo.save(log);

    this.logger.debug(
      `Audit log created: ${params.action} for order ${params.orderId || 'N/A'}`,
    );

    return saved;
  }

  /**
   * Log order creation
   */
  async logOrderCreated(order: DepositOrder, source: string = 'user'): Promise<void> {
    await this.log({
      orderId: order.id,
      userId: order.userId,
      action: 'ORDER_CREATED',
      method: order.method,
      network: order.network,
      amount: order.amount,
      newStatus: order.status,
      source,
      details: {
        orderNo: order.orderNo,
        fee: order.fee,
        netAmount: order.netAmount,
      },
    });
  }

  /**
   * Log order status change
   */
  async logStatusChange(
    order: DepositOrder,
    previousStatus: string,
    source: string = 'system',
    operatorId?: string,
  ): Promise<void> {
    let action: AuditAction;

    switch (order.status) {
      case 'CONFIRMING':
        action = 'ORDER_CONFIRMING';
        break;
      case 'COMPLETED':
        action = 'ORDER_COMPLETED';
        break;
      case 'FAILED':
        action = 'ORDER_FAILED';
        break;
      case 'CANCELLED':
        action = 'ORDER_CANCELLED';
        break;
      case 'EXPIRED':
        action = 'ORDER_EXPIRED';
        break;
      default:
        return;
    }

    await this.log({
      orderId: order.id,
      userId: order.userId,
      action,
      method: order.method,
      network: order.network,
      amount: order.amount,
      previousStatus,
      newStatus: order.status,
      source,
      operatorId,
      details: {
        orderNo: order.orderNo,
        statusRemark: order.statusRemark,
      },
    });
  }

  /**
   * Log webhook received
   */
  async logWebhookReceived(
    source: 'stripe' | 'paypal',
    eventType: string,
    orderId?: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      orderId,
      action: 'WEBHOOK_RECEIVED',
      method: source === 'stripe' ? 'CARD' : 'PAYPAL',
      source: `webhook:${source}`,
      details: {
        eventType,
        ...details,
      },
    });
  }

  /**
   * Log webhook processed
   */
  async logWebhookProcessed(
    source: 'stripe' | 'paypal',
    orderId: string,
    success: boolean,
    error?: string,
  ): Promise<void> {
    await this.log({
      orderId,
      action: success ? 'WEBHOOK_PROCESSED' : 'WEBHOOK_FAILED',
      method: source === 'stripe' ? 'CARD' : 'PAYPAL',
      source: `webhook:${source}`,
      details: success ? undefined : { error },
    });
  }

  /**
   * Log balance credited
   */
  async logBalanceCredited(
    order: DepositOrder,
    source: string = 'system',
  ): Promise<void> {
    await this.log({
      orderId: order.id,
      userId: order.userId,
      action: 'BALANCE_CREDITED',
      method: order.method,
      network: order.network,
      amount: order.netAmount,
      source,
      details: {
        orderNo: order.orderNo,
        grossAmount: order.amount,
        fee: order.fee,
        netAmount: order.netAmount,
      },
    });
  }

  /**
   * Log sweep operation
   */
  async logSweep(
    address: string,
    network: string,
    amount: number,
    txHash: string,
    success: boolean,
    error?: string,
  ): Promise<void> {
    await this.log({
      action: success ? 'SWEEP_COMPLETED' : 'SWEEP_FAILED',
      method: 'CRYPTO',
      network,
      amount,
      source: 'sweep:job',
      details: {
        address,
        txHash,
        ...(error ? { error } : {}),
      },
    });
  }

  /**
   * Log manual confirmation by admin
   */
  async logManualConfirm(
    order: DepositOrder,
    adminId: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.log({
      orderId: order.id,
      userId: order.userId,
      action: 'MANUAL_CONFIRM',
      method: order.method,
      network: order.network,
      amount: order.amount,
      previousStatus: order.status,
      newStatus: 'COMPLETED',
      source: 'admin',
      operatorId: adminId,
      ipAddress,
    });
  }

  /**
   * Get audit logs for an order
   */
  async getOrderLogs(orderId: string): Promise<DepositAuditLog[]> {
    return this.auditLogRepo.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get audit logs by action
   */
  async getLogsByAction(
    action: AuditAction,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
  ): Promise<DepositAuditLog[]> {
    const where: Record<string, unknown> = { action };

    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    } else if (startDate) {
      where.createdAt = MoreThan(startDate);
    }

    return this.auditLogRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get recent webhook logs
   */
  async getRecentWebhookLogs(limit: number = 50): Promise<DepositAuditLog[]> {
    return this.auditLogRepo
      .createQueryBuilder('log')
      .where('log.action IN (:...actions)', {
        actions: ['WEBHOOK_RECEIVED', 'WEBHOOK_PROCESSED', 'WEBHOOK_FAILED'],
      })
      .orderBy('log.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(startDate: Date, endDate: Date): Promise<{
    totalLogs: number;
    byAction: Record<string, number>;
    byMethod: Record<string, number>;
    failedWebhooks: number;
  }> {
    const logs = await this.auditLogRepo.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    const byAction: Record<string, number> = {};
    const byMethod: Record<string, number> = {};
    let failedWebhooks = 0;

    for (const log of logs) {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      if (log.method) {
        byMethod[log.method] = (byMethod[log.method] || 0) + 1;
      }
      if (log.action === 'WEBHOOK_FAILED') {
        failedWebhooks++;
      }
    }

    return {
      totalLogs: logs.length,
      byAction,
      byMethod,
      failedWebhooks,
    };
  }
}
