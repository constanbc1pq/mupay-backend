import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, Like, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { DepositOrder } from '@database/entities/deposit-order.entity';
import { DepositAddress } from '@database/entities/deposit-address.entity';
import { DepositAuditLog } from '@database/entities/deposit-audit-log.entity';
import { Transaction, TransactionType, TransactionStatus } from '@database/entities/transaction.entity';
import { Wallet } from '@database/entities/wallet.entity';
import { DepositAuditService } from '@services/notification/deposit-audit.service';
import { DepositNotificationService } from '@services/notification/deposit-notification.service';
import { AdminDepositQueryDto, AdminAuditLogQueryDto } from './dto/admin-deposit.dto';
import { PaginatedResponse } from '@common/dto/api-response.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminDepositService {
  private readonly logger = new Logger(AdminDepositService.name);

  constructor(
    @InjectRepository(DepositOrder)
    private depositOrderRepo: Repository<DepositOrder>,
    @InjectRepository(DepositAddress)
    private depositAddressRepo: Repository<DepositAddress>,
    @InjectRepository(DepositAuditLog)
    private auditLogRepo: Repository<DepositAuditLog>,
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    private auditService: DepositAuditService,
    private notificationService: DepositNotificationService,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  /**
   * Get deposit orders with filters
   */
  async getDepositOrders(query: AdminDepositQueryDto): Promise<PaginatedResponse<DepositOrder>> {
    const { page = 1, pageSize = 10, userId, orderNo, method, network, status, startDate, endDate } = query;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (userId) where.userId = userId;
    if (orderNo) where.orderNo = Like(`%${orderNo}%`);
    if (method) where.method = method;
    if (network) where.network = network;
    if (status) where.status = status;

    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      where.createdAt = MoreThanOrEqual(new Date(startDate));
    } else if (endDate) {
      where.createdAt = LessThanOrEqual(new Date(endDate));
    }

    const [items, total] = await this.depositOrderRepo.findAndCount({
      where,
      relations: ['user'],
      skip,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return new PaginatedResponse(items, total, page, pageSize);
  }

  /**
   * Get deposit order detail
   */
  async getDepositOrderDetail(orderId: string): Promise<{
    order: DepositOrder;
    auditLogs: DepositAuditLog[];
  }> {
    const order = await this.depositOrderRepo.findOne({
      where: { id: orderId },
      relations: ['user'],
    });

    if (!order) {
      throw new NotFoundException('Deposit order not found');
    }

    const auditLogs = await this.auditService.getOrderLogs(orderId);

    return { order, auditLogs };
  }

  /**
   * Manually confirm a deposit order (admin)
   */
  async manualConfirm(
    orderId: string,
    adminId: string,
    ipAddress?: string,
    remark?: string,
  ): Promise<DepositOrder> {
    const order = await this.depositOrderRepo.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Deposit order not found');
    }

    if (order.status === 'COMPLETED') {
      throw new BadRequestException('Order already completed');
    }

    if (order.status !== 'CONFIRMING' && order.status !== 'PENDING') {
      throw new BadRequestException('Order cannot be manually confirmed');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const previousStatus = order.status;

      // Update order status
      order.status = 'COMPLETED';
      order.confirmedAt = new Date();
      order.completedAt = new Date();
      order.statusRemark = remark || 'Manually confirmed by admin';
      await queryRunner.manager.save(order);

      // Update user wallet balance
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId: order.userId },
      });

      if (wallet) {
        wallet.balance = Number(wallet.balance) + Number(order.netAmount);
        await queryRunner.manager.save(wallet);
      }

      // Update deposit address stats if crypto
      if (order.method === 'CRYPTO' && order.network) {
        const depositAddress = await queryRunner.manager.findOne(DepositAddress, {
          where: {
            userId: order.userId,
            network: order.network,
            isActive: true,
          },
        });

        if (depositAddress) {
          depositAddress.totalReceived = Number(depositAddress.totalReceived) + Number(order.netAmount);
          depositAddress.totalTransactions += 1;
          depositAddress.lastReceivedAt = new Date();
          await queryRunner.manager.save(depositAddress);
        }
      }

      // Create transaction record
      const transaction = new Transaction();
      transaction.userId = order.userId;
      transaction.type = TransactionType.DEPOSIT;
      transaction.amount = order.netAmount;
      transaction.fee = order.fee;
      transaction.status = TransactionStatus.COMPLETED;
      transaction.remark = `${order.method} deposit (manual confirm)`;
      transaction.relatedId = order.id;
      transaction.completedAt = new Date();
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      // Log audit
      await this.auditService.logManualConfirm(order, adminId, ipAddress);
      await this.auditService.logStatusChange(order, previousStatus, 'admin', adminId);
      await this.auditService.logBalanceCredited(order, 'admin');

      // Notify user
      await this.notificationService.notifyDepositSuccess(order);

      this.logger.log(`Manual confirm by admin ${adminId}: ${order.orderNo}`);

      return order;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get deposit statistics
   */
  async getDepositStats(startDate?: Date, endDate?: Date): Promise<{
    totalOrders: number;
    completedOrders: number;
    totalAmount: number;
    totalFee: number;
    byMethod: Record<string, { count: number; amount: number }>;
    byStatus: Record<string, number>;
    dailyStats: Array<{ date: string; count: number; amount: number }>;
  }> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const end = endDate || new Date();

    // Get all orders in date range
    const orders = await this.depositOrderRepo.find({
      where: {
        createdAt: Between(start, end),
      },
    });

    const completedOrders = orders.filter(o => o.status === 'COMPLETED');

    // Calculate totals
    const totalAmount = completedOrders.reduce((sum, o) => sum + Number(o.amount), 0);
    const totalFee = completedOrders.reduce((sum, o) => sum + Number(o.fee), 0);

    // Group by method
    const byMethod: Record<string, { count: number; amount: number }> = {};
    for (const order of completedOrders) {
      if (!byMethod[order.method]) {
        byMethod[order.method] = { count: 0, amount: 0 };
      }
      byMethod[order.method].count++;
      byMethod[order.method].amount += Number(order.amount);
    }

    // Group by status
    const byStatus: Record<string, number> = {};
    for (const order of orders) {
      byStatus[order.status] = (byStatus[order.status] || 0) + 1;
    }

    // Daily stats for completed orders
    const dailyMap = new Map<string, { count: number; amount: number }>();
    for (const order of completedOrders) {
      const date = order.completedAt?.toISOString().split('T')[0] || order.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { count: 0, amount: 0 };
      existing.count++;
      existing.amount += Number(order.amount);
      dailyMap.set(date, existing);
    }

    const dailyStats = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      totalAmount,
      totalFee,
      byMethod,
      byStatus,
      dailyStats,
    };
  }

  /**
   * Get hot wallet balance info (placeholder - would integrate with actual wallet provider)
   */
  async getHotWalletBalance(): Promise<{
    wallets: Array<{
      network: string;
      address: string;
      balance: number;
      pendingSweep: number;
    }>;
    totalBalance: number;
  }> {
    // Get configured hot wallet addresses
    const networks = ['ERC20', 'BEP20', 'TRC20'];
    const wallets = [];

    for (const network of networks) {
      const address = this.configService.get<string>(`blockchain.${network.toLowerCase()}.hotWallet`);
      if (address) {
        // Calculate pending sweep amount
        const pendingAddresses = await this.depositAddressRepo
          .createQueryBuilder('addr')
          .select('SUM(addr.totalReceived - addr.totalSwept)', 'pending')
          .where('addr.network = :network', { network })
          .andWhere('addr.isActive = true')
          .getRawOne();

        wallets.push({
          network,
          address: address || 'Not configured',
          balance: 0, // Would need blockchain integration to get actual balance
          pendingSweep: Number(pendingAddresses?.pending || 0),
        });
      }
    }

    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

    return { wallets, totalBalance };
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(query: AdminAuditLogQueryDto): Promise<PaginatedResponse<DepositAuditLog>> {
    const { page = 1, pageSize = 20, orderId, action, startDate, endDate } = query;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (orderId) where.orderId = orderId;
    if (action) where.action = action;

    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      where.createdAt = MoreThanOrEqual(new Date(startDate));
    } else if (endDate) {
      where.createdAt = LessThanOrEqual(new Date(endDate));
    }

    const [items, total] = await this.auditLogRepo.findAndCount({
      where,
      skip,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return new PaginatedResponse(items, total, page, pageSize);
  }

  /**
   * Get deposit addresses for admin management
   */
  async getDepositAddresses(query: { userId?: string; network?: string; page?: number; pageSize?: number }) {
    const { userId, network, page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (network) where.network = network;

    const [items, total] = await this.depositAddressRepo.findAndCount({
      where,
      relations: ['user'],
      skip,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return new PaginatedResponse(items, total, page, pageSize);
  }
}
