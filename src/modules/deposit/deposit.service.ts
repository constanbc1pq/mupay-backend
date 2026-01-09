import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DepositOrder, DepositMethod, DepositStatus, NetworkType } from '@database/entities/deposit-order.entity';
import { DepositAddress } from '@database/entities/deposit-address.entity';
import { Transaction, TransactionType, TransactionStatus } from '@database/entities/transaction.entity';
import { Wallet } from '@database/entities/wallet.entity';
import { BlockchainMonitorService } from '@services/blockchain/monitor.service';
import { StripeService } from '@services/payment/stripe.service';
import { PayPalService } from '@services/payment/paypal.service';
import { DepositAuditService } from '@services/notification/deposit-audit.service';
import { DepositNotificationService } from '@services/notification/deposit-notification.service';
import { DepositLimitService } from './deposit-limit.service';
import { MSG } from '@common/constants/messages';
import { PaginationQueryDto, PaginatedResponse } from '@common/dto/api-response.dto';

@Injectable()
export class DepositService {
  private readonly logger = new Logger(DepositService.name);

  constructor(
    @InjectRepository(DepositOrder)
    private depositOrderRepo: Repository<DepositOrder>,
    @InjectRepository(DepositAddress)
    private depositAddressRepo: Repository<DepositAddress>,
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,
    private monitorService: BlockchainMonitorService,
    private stripeService: StripeService,
    private paypalService: PayPalService,
    private auditService: DepositAuditService,
    private notificationService: DepositNotificationService,
    @Inject(forwardRef(() => DepositLimitService))
    private depositLimitService: DepositLimitService,
    private dataSource: DataSource,
  ) {}

  /**
   * Generate a unique order number
   */
  private generateOrderNo(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    return `DEP${timestamp}${random}`;
  }

  /**
   * Create a new crypto deposit order
   */
  async createCryptoDepositOrder(
    userId: string,
    network: NetworkType,
    txHash: string,
    fromAddress: string,
    amount: number,
    blockNumber: number,
  ): Promise<DepositOrder> {
    // Get deposit address for user and network
    const depositAddress = await this.depositAddressRepo.findOne({
      where: { userId, network, isActive: true },
    });

    if (!depositAddress) {
      throw new BadRequestException('Deposit address not found');
    }

    // Create deposit order
    const order = this.depositOrderRepo.create({
      userId,
      orderNo: this.generateOrderNo(),
      method: 'CRYPTO',
      network,
      txHash,
      fromAddress,
      toAddress: depositAddress.address,
      blockNumber,
      confirmations: 0,
      amount,
      fee: 0,
      netAmount: amount,
      currency: 'USDT',
      status: 'CONFIRMING',
    });

    const savedOrder = await this.depositOrderRepo.save(order);

    // Log order creation
    await this.auditService.logOrderCreated(savedOrder, 'blockchain');

    // Notify user about confirming deposit
    await this.notificationService.notifyDepositConfirming(savedOrder, 0, this.getRequiredConfirmations(network));

    return savedOrder;
  }

  /**
   * Get required confirmations for a network
   */
  private getRequiredConfirmations(network: NetworkType): number {
    const confirmations: Record<NetworkType, number> = {
      ERC20: 12,
      BEP20: 15,
      TRC20: 20,
    };
    return confirmations[network] || 12;
  }

  /**
   * Process newly detected deposits
   */
  async processNewDeposits(): Promise<number> {
    let processedCount = 0;

    // Scan all networks
    const [erc20Deposits, bep20Deposits, trc20Deposits] = await Promise.all([
      this.monitorService.scanERC20Deposits(),
      this.monitorService.scanBEP20Deposits(),
      this.monitorService.scanTRC20Deposits(),
    ]);

    const allDeposits = [...erc20Deposits, ...bep20Deposits, ...trc20Deposits];

    for (const deposit of allDeposits) {
      try {
        await this.createCryptoDepositOrder(
          deposit.userId,
          deposit.network,
          deposit.txHash,
          deposit.fromAddress,
          deposit.amount,
          deposit.blockNumber,
        );
        processedCount++;
        this.logger.log(
          `Created deposit order: ${deposit.txHash} for user ${deposit.userId} (${deposit.amount} USDT)`,
        );
      } catch (error) {
        this.logger.error(`Failed to create deposit order: ${deposit.txHash}`, error);
      }
    }

    return processedCount;
  }

  /**
   * Check and confirm pending deposits
   */
  async confirmPendingDeposits(): Promise<number> {
    let confirmedCount = 0;

    // Get all deposits in CONFIRMING status
    const pendingDeposits = await this.depositOrderRepo.find({
      where: { method: 'CRYPTO', status: 'CONFIRMING' },
    });

    for (const deposit of pendingDeposits) {
      try {
        const confirmations = await this.monitorService.getConfirmations(
          deposit.network,
          deposit.txHash,
          deposit.blockNumber,
        );

        // Update confirmation count
        deposit.confirmations = confirmations;
        await this.depositOrderRepo.save(deposit);

        // Check if confirmed
        const isConfirmed = await this.monitorService.isConfirmed(
          deposit.network,
          deposit.txHash,
          deposit.blockNumber,
        );

        if (isConfirmed) {
          await this.completeDeposit(deposit);
          confirmedCount++;
          this.logger.log(
            `Confirmed deposit: ${deposit.orderNo} (${deposit.amount} USDT)`,
          );
        }
      } catch (error) {
        this.logger.error(`Failed to confirm deposit: ${deposit.orderNo}`, error);
      }
    }

    return confirmedCount;
  }

  /**
   * Complete a deposit and credit user balance
   */
  private async completeDeposit(deposit: DepositOrder): Promise<void> {
    const previousStatus = deposit.status;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update deposit order status
      deposit.status = 'COMPLETED';
      deposit.confirmedAt = new Date();
      deposit.completedAt = new Date();
      await queryRunner.manager.save(deposit);

      // Update user wallet balance
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId: deposit.userId },
      });

      if (wallet) {
        wallet.balance = Number(wallet.balance) + Number(deposit.netAmount);
        await queryRunner.manager.save(wallet);
      }

      // Update deposit address stats
      const depositAddress = await queryRunner.manager.findOne(DepositAddress, {
        where: {
          userId: deposit.userId,
          network: deposit.network,
          isActive: true,
        },
      });

      if (depositAddress) {
        depositAddress.totalReceived =
          Number(depositAddress.totalReceived) + Number(deposit.netAmount);
        depositAddress.totalTransactions += 1;
        depositAddress.lastReceivedAt = new Date();
        await queryRunner.manager.save(depositAddress);
      }

      // Create transaction record
      const transaction = new Transaction();
      transaction.userId = deposit.userId;
      transaction.type = TransactionType.DEPOSIT;
      transaction.amount = deposit.netAmount;
      transaction.fee = deposit.fee;
      transaction.status = TransactionStatus.COMPLETED;
      transaction.remark = `${deposit.network} deposit`;
      transaction.relatedId = deposit.id;
      transaction.completedAt = new Date();
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      // Log status change and balance credit
      await this.auditService.logStatusChange(deposit, previousStatus, 'blockchain');
      await this.auditService.logBalanceCredited(deposit, 'blockchain');

      // Notify user about successful deposit
      await this.notificationService.notifyDepositSuccess(deposit);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get deposit orders for a user
   */
  async getOrders(
    userId: string,
    query: PaginationQueryDto & { method?: DepositMethod; status?: DepositStatus },
  ): Promise<PaginatedResponse<DepositOrder>> {
    const { page = 1, pageSize = 10, method, status } = query;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { userId };
    if (method) where.method = method;
    if (status) where.status = status;

    const [items, total] = await this.depositOrderRepo.findAndCount({
      where,
      skip,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return new PaginatedResponse(items, total, page, pageSize);
  }

  /**
   * Get deposit order detail
   */
  async getOrderDetail(userId: string, orderId: string): Promise<DepositOrder> {
    const order = await this.depositOrderRepo.findOne({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new NotFoundException(MSG.WALLET_TRANSACTION_NOT_FOUND);
    }

    return order;
  }

  /**
   * Create a card deposit order (Stripe)
   */
  async createCardDeposit(
    userId: string,
    amount: number,
    email?: string,
  ): Promise<{ order: DepositOrder; clientSecret: string }> {
    if (!this.stripeService.isEnabled()) {
      throw new BadRequestException('Card payments are not available');
    }

    // Check deposit limits
    await this.depositLimitService.validateDeposit(userId, 'CARD', amount);

    // Create deposit order
    const orderNo = this.generateOrderNo();
    const { fee, netAmount } = this.stripeService.calculateFee(amount);

    const order = this.depositOrderRepo.create({
      userId,
      orderNo,
      method: 'CARD',
      amount,
      fee,
      netAmount,
      currency: 'USDT',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    });

    const savedOrder = await this.depositOrderRepo.save(order);

    // Create Stripe PaymentIntent
    const paymentResult = await this.stripeService.createPaymentIntent({
      amount,
      userId,
      orderId: savedOrder.id,
      email,
    });

    // Update order with Stripe PaymentIntent ID
    savedOrder.stripePaymentIntentId = paymentResult.paymentIntentId;
    await this.depositOrderRepo.save(savedOrder);

    return {
      order: savedOrder,
      clientSecret: paymentResult.clientSecret,
    };
  }

  /**
   * Handle Stripe payment success
   */
  async handleStripePaymentSuccess(
    paymentIntentId: string,
  ): Promise<DepositOrder | null> {
    const order = await this.depositOrderRepo.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!order) {
      this.logger.warn(`No order found for PaymentIntent: ${paymentIntentId}`);
      return null;
    }

    if (order.status === 'COMPLETED') {
      this.logger.warn(`Order already completed: ${order.orderNo}`);
      return order;
    }

    // Complete the deposit
    await this.completeCardDeposit(order);

    return order;
  }

  /**
   * Handle Stripe payment failure
   */
  async handleStripePaymentFailure(
    paymentIntentId: string,
    failureReason?: string,
  ): Promise<DepositOrder | null> {
    const order = await this.depositOrderRepo.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!order) {
      return null;
    }

    const previousStatus = order.status;
    order.status = 'FAILED';
    order.statusRemark = failureReason || 'Payment failed';
    await this.depositOrderRepo.save(order);

    // Log status change
    await this.auditService.logStatusChange(order, previousStatus, 'stripe');

    // Notify user about failed deposit
    await this.notificationService.notifyDepositFailed(order, failureReason);

    return order;
  }

  /**
   * Complete a card deposit and credit user balance
   */
  private async completeCardDeposit(deposit: DepositOrder): Promise<void> {
    const previousStatus = deposit.status;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update deposit order status
      deposit.status = 'COMPLETED';
      deposit.confirmedAt = new Date();
      deposit.completedAt = new Date();
      await queryRunner.manager.save(deposit);

      // Update user wallet balance
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId: deposit.userId },
      });

      if (wallet) {
        wallet.balance = Number(wallet.balance) + Number(deposit.netAmount);
        await queryRunner.manager.save(wallet);
      }

      // Create transaction record
      const transaction = new Transaction();
      transaction.userId = deposit.userId;
      transaction.type = TransactionType.DEPOSIT;
      transaction.amount = deposit.netAmount;
      transaction.fee = deposit.fee;
      transaction.status = TransactionStatus.COMPLETED;
      transaction.remark = 'Card deposit';
      transaction.relatedId = deposit.id;
      transaction.completedAt = new Date();
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      // Log status change and balance credit
      await this.auditService.logStatusChange(deposit, previousStatus, 'stripe');
      await this.auditService.logBalanceCredited(deposit, 'stripe');

      // Notify user about successful deposit
      await this.notificationService.notifyDepositSuccess(deposit);

      this.logger.log(`Card deposit completed: ${deposit.orderNo} (${deposit.netAmount} USDT)`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get card deposit order by PaymentIntent ID
   */
  async getOrderByPaymentIntentId(paymentIntentId: string): Promise<DepositOrder | null> {
    return this.depositOrderRepo.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
    });
  }

  /**
   * Create a PayPal deposit order
   */
  async createPayPalDeposit(
    userId: string,
    amount: number,
  ): Promise<{ order: DepositOrder; approvalUrl: string }> {
    if (!this.paypalService.isEnabled()) {
      throw new BadRequestException('PayPal payments are not available');
    }

    // Check deposit limits
    await this.depositLimitService.validateDeposit(userId, 'PAYPAL', amount);

    // Create deposit order
    const orderNo = this.generateOrderNo();
    const { fee, netAmount } = this.paypalService.calculateFee(amount);

    const order = this.depositOrderRepo.create({
      userId,
      orderNo,
      method: 'PAYPAL',
      amount,
      fee,
      netAmount,
      currency: 'USDT',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    });

    const savedOrder = await this.depositOrderRepo.save(order);

    // Create PayPal order
    const paypalResult = await this.paypalService.createOrder({
      amount,
      userId,
      orderId: savedOrder.id,
    });

    // Update order with PayPal Order ID
    savedOrder.paypalOrderId = paypalResult.paypalOrderId;
    await this.depositOrderRepo.save(savedOrder);

    return {
      order: savedOrder,
      approvalUrl: paypalResult.approvalUrl,
    };
  }

  /**
   * Capture PayPal order after user approval
   */
  async capturePayPalOrder(
    userId: string,
    paypalOrderId: string,
  ): Promise<DepositOrder> {
    const order = await this.depositOrderRepo.findOne({
      where: { paypalOrderId, userId },
    });

    if (!order) {
      throw new NotFoundException('PayPal order not found');
    }

    if (order.status === 'COMPLETED') {
      return order;
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException('Order cannot be captured');
    }

    // Capture the PayPal order
    const capturedOrder = await this.paypalService.captureOrder(paypalOrderId);

    if (capturedOrder.status !== 'COMPLETED') {
      order.status = 'FAILED';
      order.statusRemark = `PayPal capture failed: ${capturedOrder.status}`;
      await this.depositOrderRepo.save(order);
      throw new BadRequestException('PayPal payment failed');
    }

    // Complete the deposit
    await this.completePayPalDeposit(order);

    return order;
  }

  /**
   * Handle PayPal webhook event
   */
  async handlePayPalWebhook(
    eventType: string,
    resourceId: string,
    resource: Record<string, unknown>,
  ): Promise<DepositOrder | null> {
    // Extract order ID from resource - PayPal uses custom_id or supplementary_data
    const getPayPalOrderId = (res: Record<string, unknown>): string | null => {
      // Try custom_id first (set during order creation)
      if (res.custom_id && typeof res.custom_id === 'string') {
        return res.custom_id;
      }
      // Try supplementary_data.related_ids.order_id
      const suppData = res.supplementary_data as Record<string, unknown> | undefined;
      const relatedIds = suppData?.related_ids as Record<string, unknown> | undefined;
      if (relatedIds?.order_id && typeof relatedIds.order_id === 'string') {
        return relatedIds.order_id;
      }
      return null;
    };

    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const paypalOrderId = getPayPalOrderId(resource);
        if (!paypalOrderId) return null;

        const order = await this.depositOrderRepo.findOne({
          where: { paypalOrderId },
        });

        if (!order || order.status === 'COMPLETED') return order;

        await this.completePayPalDeposit(order);
        return order;
      }

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REFUNDED': {
        const paypalOrderId = getPayPalOrderId(resource);
        if (!paypalOrderId) return null;

        const order = await this.depositOrderRepo.findOne({
          where: { paypalOrderId },
        });

        if (!order) return null;

        order.status = eventType === 'PAYMENT.CAPTURE.REFUNDED' ? 'CANCELLED' : 'FAILED';
        order.statusRemark = `PayPal event: ${eventType}`;
        await this.depositOrderRepo.save(order);
        return order;
      }

      default:
        return null;
    }
  }

  /**
   * Complete a PayPal deposit and credit user balance
   */
  private async completePayPalDeposit(deposit: DepositOrder): Promise<void> {
    const previousStatus = deposit.status;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update deposit order status
      deposit.status = 'COMPLETED';
      deposit.confirmedAt = new Date();
      deposit.completedAt = new Date();
      await queryRunner.manager.save(deposit);

      // Update user wallet balance
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId: deposit.userId },
      });

      if (wallet) {
        wallet.balance = Number(wallet.balance) + Number(deposit.netAmount);
        await queryRunner.manager.save(wallet);
      }

      // Create transaction record
      const transaction = new Transaction();
      transaction.userId = deposit.userId;
      transaction.type = TransactionType.DEPOSIT;
      transaction.amount = deposit.netAmount;
      transaction.fee = deposit.fee;
      transaction.status = TransactionStatus.COMPLETED;
      transaction.remark = 'PayPal deposit';
      transaction.relatedId = deposit.id;
      transaction.completedAt = new Date();
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      // Log status change and balance credit
      await this.auditService.logStatusChange(deposit, previousStatus, 'paypal');
      await this.auditService.logBalanceCredited(deposit, 'paypal');

      // Notify user about successful deposit
      await this.notificationService.notifyDepositSuccess(deposit);

      this.logger.log(`PayPal deposit completed: ${deposit.orderNo} (${deposit.netAmount} USDT)`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get PayPal deposit order by PayPal Order ID
   */
  async getOrderByPayPalOrderId(paypalOrderId: string): Promise<DepositOrder | null> {
    return this.depositOrderRepo.findOne({
      where: { paypalOrderId },
    });
  }

  /**
   * Get available deposit methods and limits
   */
  async getDepositMethods(userId: string) {
    const stripeConfig = this.stripeService.getFeeConfig();
    const paypalConfig = this.paypalService.getFeeConfig();

    return {
      methods: [
        {
          method: 'CRYPTO',
          name: '链上充值',
          networks: ['TRC20', 'ERC20', 'BEP20'],
          minAmount: { TRC20: 10, ERC20: 50, BEP20: 10 },
          maxAmount: { TRC20: 100000, ERC20: 100000, BEP20: 100000 },
          fee: { TRC20: 0, ERC20: 0, BEP20: 0 },
          confirmations: { TRC20: 20, ERC20: 12, BEP20: 15 },
          enabled: true,
        },
        {
          method: 'CARD',
          name: '银行卡充值',
          supportedCards: ['VISA', 'MASTERCARD'],
          minAmount: stripeConfig.minAmount,
          maxAmount: stripeConfig.maxAmount,
          feeRate: stripeConfig.feeRate,
          enabled: this.stripeService.isEnabled(),
        },
        {
          method: 'PAYPAL',
          name: 'PayPal 充值',
          minAmount: paypalConfig.minAmount,
          maxAmount: paypalConfig.maxAmount,
          feeRate: paypalConfig.feeRate,
          enabled: this.paypalService.isEnabled(),
        },
      ],
    };
  }

  /**
   * Expire pending orders that have exceeded their expiry time
   */
  async expirePendingOrders(): Promise<number> {
    const now = new Date();

    // Find pending orders that have expired (CARD and PAYPAL only)
    // Crypto orders don't have expiry as they wait for blockchain confirmation
    const expiredOrders = await this.depositOrderRepo
      .createQueryBuilder('order')
      .where('order.status = :status', { status: 'PENDING' })
      .andWhere('order.method IN (:...methods)', { methods: ['CARD', 'PAYPAL'] })
      .andWhere('order.expiresAt IS NOT NULL')
      .andWhere('order.expiresAt < :now', { now })
      .getMany();

    if (expiredOrders.length === 0) {
      return 0;
    }

    // Update all expired orders
    for (const order of expiredOrders) {
      const previousStatus = order.status;
      order.status = 'EXPIRED';
      order.statusRemark = 'Order expired due to timeout';
      await this.depositOrderRepo.save(order);

      // Log status change
      await this.auditService.logStatusChange(order, previousStatus, 'system');

      this.logger.log(`Expired order: ${order.orderNo} (${order.method})`);
    }

    return expiredOrders.length;
  }

  /**
   * Cancel a pending order manually
   */
  async cancelOrder(userId: string, orderId: string): Promise<DepositOrder> {
    const order = await this.depositOrderRepo.findOne({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new NotFoundException(MSG.WALLET_TRANSACTION_NOT_FOUND);
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    const previousStatus = order.status;
    order.status = 'CANCELLED';
    order.statusRemark = 'Cancelled by user';
    await this.depositOrderRepo.save(order);

    // Log status change
    await this.auditService.logStatusChange(order, previousStatus, 'user');

    this.logger.log(`Order cancelled by user: ${order.orderNo}`);

    return order;
  }
}
