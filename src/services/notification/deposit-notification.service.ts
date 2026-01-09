import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { UserNotification, NotificationType } from '@database/entities/user-notification.entity';
import { User } from '@database/entities/user.entity';
import { DepositOrder } from '@database/entities/deposit-order.entity';

interface NotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  relatedId?: string;
  relatedType?: string;
  extra?: Record<string, unknown>;
}

@Injectable()
export class DepositNotificationService {
  private readonly logger = new Logger(DepositNotificationService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(UserNotification)
    private notificationRepo: Repository<UserNotification>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('email.host'),
      port: this.configService.get<number>('email.port'),
      secure: this.configService.get<boolean>('email.secure'),
      auth: {
        user: this.configService.get<string>('email.user'),
        pass: this.configService.get<string>('email.password'),
      },
    });
  }

  /**
   * Create an in-app notification
   */
  async createNotification(params: NotificationParams): Promise<UserNotification> {
    const notification = this.notificationRepo.create({
      ...params,
      extra: params.extra ? JSON.stringify(params.extra) : null,
      isRead: false,
    });

    const saved = await this.notificationRepo.save(notification);
    this.logger.debug(`Notification created for user ${params.userId}: ${params.type}`);

    return saved;
  }

  /**
   * Notify user about deposit success
   */
  async notifyDepositSuccess(order: DepositOrder): Promise<void> {
    const user = await this.userRepo.findOneBy({ id: order.userId });
    if (!user) {
      this.logger.warn(`User not found for deposit notification: ${order.userId}`);
      return;
    }

    // Create in-app notification
    await this.createNotification({
      userId: order.userId,
      type: 'DEPOSIT_SUCCESS',
      title: 'Deposit Successful',
      content: `Your deposit of ${order.netAmount} USDT has been credited to your account.`,
      relatedId: order.id,
      relatedType: 'deposit_order',
      extra: {
        orderNo: order.orderNo,
        method: order.method,
        network: order.network,
        amount: order.amount,
        fee: order.fee,
        netAmount: order.netAmount,
      },
    });

    // Send email notification
    await this.sendDepositSuccessEmail(user.email, order);
  }

  /**
   * Notify user about deposit confirming (pending confirmations)
   */
  async notifyDepositConfirming(order: DepositOrder, confirmations: number, required: number): Promise<void> {
    await this.createNotification({
      userId: order.userId,
      type: 'DEPOSIT_CONFIRMING',
      title: 'Deposit Confirming',
      content: `Your deposit of ${order.amount} USDT is being confirmed (${confirmations}/${required}).`,
      relatedId: order.id,
      relatedType: 'deposit_order',
      extra: {
        orderNo: order.orderNo,
        confirmations,
        required,
      },
    });
  }

  /**
   * Notify user about deposit failure
   */
  async notifyDepositFailed(order: DepositOrder, reason?: string): Promise<void> {
    const user = await this.userRepo.findOneBy({ id: order.userId });
    if (!user) {
      this.logger.warn(`User not found for deposit notification: ${order.userId}`);
      return;
    }

    // Create in-app notification
    await this.createNotification({
      userId: order.userId,
      type: 'DEPOSIT_FAILED',
      title: 'Deposit Failed',
      content: reason || `Your deposit order ${order.orderNo} has failed. Please contact support.`,
      relatedId: order.id,
      relatedType: 'deposit_order',
      extra: {
        orderNo: order.orderNo,
        method: order.method,
        network: order.network,
        amount: order.amount,
        reason,
      },
    });

    // Send email notification
    await this.sendDepositFailedEmail(user.email, order, reason);
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
  ): Promise<{ items: UserNotification[]; total: number }> {
    const where: Record<string, unknown> = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [items, total] = await this.notificationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    const result = await this.notificationRepo.update(
      { id: notificationId, userId },
      { isRead: true, readAt: new Date() },
    );

    return (result.affected ?? 0) > 0;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    return result.affected ?? 0;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Send deposit success email
   */
  private async sendDepositSuccessEmail(to: string, order: DepositOrder): Promise<void> {
    const from = this.configService.get<string>('email.from');

    const html = this.generateEmailTemplate({
      title: 'Deposit Successful',
      content: `
        <p>Your deposit has been credited to your MuPay account.</p>
        <div class="details">
          <p><strong>Order Number:</strong> ${order.orderNo}</p>
          <p><strong>Method:</strong> ${order.method}</p>
          ${order.network ? `<p><strong>Network:</strong> ${order.network}</p>` : ''}
          <p><strong>Amount:</strong> ${order.amount} USDT</p>
          <p><strong>Fee:</strong> ${order.fee} USDT</p>
          <p><strong>Net Amount:</strong> ${order.netAmount} USDT</p>
        </div>
        <p>Your balance has been updated accordingly.</p>
      `,
    });

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'MuPay - Deposit Successful',
        html,
      });
      this.logger.log(`Deposit success email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send deposit success email to ${to}`, error);
      // In development, don't fail silently
      if (this.configService.get<string>('nodeEnv') === 'development') {
        this.logger.warn(`[DEV] Deposit success email for ${to}: Order ${order.orderNo}`);
      }
    }
  }

  /**
   * Send deposit failed email
   */
  private async sendDepositFailedEmail(to: string, order: DepositOrder, reason?: string): Promise<void> {
    const from = this.configService.get<string>('email.from');

    const html = this.generateEmailTemplate({
      title: 'Deposit Failed',
      content: `
        <p>Unfortunately, your deposit could not be processed.</p>
        <div class="details">
          <p><strong>Order Number:</strong> ${order.orderNo}</p>
          <p><strong>Method:</strong> ${order.method}</p>
          ${order.network ? `<p><strong>Network:</strong> ${order.network}</p>` : ''}
          <p><strong>Amount:</strong> ${order.amount} USDT</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        <p>If you believe this is an error, please contact our support team.</p>
      `,
    });

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'MuPay - Deposit Failed',
        html,
      });
      this.logger.log(`Deposit failed email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send deposit failed email to ${to}`, error);
      if (this.configService.get<string>('nodeEnv') === 'development') {
        this.logger.warn(`[DEV] Deposit failed email for ${to}: Order ${order.orderNo}`);
      }
    }
  }

  /**
   * Generate email HTML template
   */
  private generateEmailTemplate(params: { title: string; content: string }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; }
          .logo { font-size: 32px; font-weight: bold; color: #3B82F6; }
          .content { padding: 20px 0; }
          .details {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
          }
          .details p { margin: 5px 0; }
          .footer {
            text-align: center;
            padding: 20px 0;
            color: #999;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">MuPay</div>
          </div>
          <div class="content">
            <h2>${params.title}</h2>
            ${params.content}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MuPay. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
