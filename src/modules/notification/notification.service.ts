import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserNotification,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
} from '@database/entities/user-notification.entity';
import { MessageTemplate } from '@database/entities/message-template.entity';
import { User } from '@database/entities/user.entity';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  content: string;
  priority?: NotificationPriority;
  relatedId?: string;
  relatedType?: string;
  extra?: Record<string, unknown>;
  expireAt?: Date;
}

interface SendFromTemplateParams {
  userId: string;
  templateCode: string;
  variables: Record<string, string>;
  relatedId?: string;
  relatedType?: string;
  extra?: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(UserNotification)
    private notificationRepo: Repository<UserNotification>,
    @InjectRepository(MessageTemplate)
    private templateRepo: Repository<MessageTemplate>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * Create a notification directly
   */
  async createNotification(params: CreateNotificationParams): Promise<UserNotification> {
    const notification = this.notificationRepo.create({
      userId: params.userId,
      type: params.type,
      category: params.category,
      title: params.title,
      content: params.content,
      priority: params.priority || 'normal',
      relatedId: params.relatedId || null,
      relatedType: params.relatedType || null,
      extra: params.extra ? JSON.stringify(params.extra) : null,
      expireAt: params.expireAt || null,
      isRead: false,
    });

    const saved = await this.notificationRepo.save(notification);
    this.logger.debug(`Notification created for user ${params.userId}: ${params.type}`);
    return saved;
  }

  /**
   * Send notification using template
   */
  async sendFromTemplate(params: SendFromTemplateParams): Promise<UserNotification | null> {
    const template = await this.templateRepo.findOneBy({
      code: params.templateCode,
      isActive: true,
    });

    if (!template) {
      this.logger.warn(`Template not found or inactive: ${params.templateCode}`);
      return null;
    }

    // Replace variables in title and content
    let title = template.title;
    let content = template.content;

    for (const [key, value] of Object.entries(params.variables)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      title = title.replace(placeholder, value);
      content = content.replace(placeholder, value);
    }

    return this.createNotification({
      userId: params.userId,
      type: params.templateCode as NotificationType,
      category: template.type as NotificationCategory,
      title,
      content,
      relatedId: params.relatedId,
      relatedType: params.relatedType,
      extra: params.extra,
    });
  }

  /**
   * Send welcome message to new user
   */
  async sendWelcomeMessage(userId: string, nickname: string): Promise<UserNotification | null> {
    this.logger.log(`Sending welcome message to user ${userId} (${nickname})`);
    const result = await this.sendFromTemplate({
      userId,
      templateCode: 'WELCOME',
      variables: { nickname: nickname || 'User' },
    });
    if (result) {
      this.logger.log(`Welcome message sent successfully to user ${userId}`);
    } else {
      this.logger.warn(`Failed to send welcome message to user ${userId} - template not found?`);
    }
    return result;
  }

  /**
   * Get notifications for user
   */
  async getNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      category?: NotificationCategory;
      unreadOnly?: boolean;
    } = {},
  ): Promise<{ items: UserNotification[]; total: number; unreadCount: number }> {
    const { page = 1, limit = 20, category, unreadOnly } = options;

    const queryBuilder = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .andWhere('(n.expireAt IS NULL OR n.expireAt > NOW())');

    if (category) {
      queryBuilder.andWhere('n.category = :category', { category });
    }

    if (unreadOnly) {
      queryBuilder.andWhere('n.isRead = false');
    }

    queryBuilder
      .orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    // Get unread count
    const unreadCount = await this.notificationRepo.count({
      where: { userId, isRead: false },
    });

    return { items, total, unreadCount };
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, isRead: false },
    });
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
   * Delete notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<boolean> {
    const result = await this.notificationRepo.delete({
      id: notificationId,
      userId,
    });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(
    userId: string,
    notificationId: string,
  ): Promise<UserNotification | null> {
    return this.notificationRepo.findOneBy({
      id: notificationId,
      userId,
    });
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    templateCode: string,
    variables: Record<string, string>,
  ): Promise<number> {
    let count = 0;
    for (const userId of userIds) {
      const result = await this.sendFromTemplate({
        userId,
        templateCode,
        variables,
      });
      if (result) count++;
    }
    return count;
  }
}
