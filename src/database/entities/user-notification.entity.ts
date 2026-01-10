import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export type NotificationType =
  | 'WELCOME'
  | 'DEPOSIT_SUCCESS'
  | 'DEPOSIT_FAILED'
  | 'DEPOSIT_CONFIRMING'
  | 'WITHDRAW_SUCCESS'
  | 'WITHDRAW_FAILED'
  | 'TRANSFER_RECEIVED'
  | 'TRANSFER_SENT'
  | 'CARD_APPLIED'
  | 'CARD_RECHARGED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED'
  | 'SYSTEM_NOTICE'
  | 'AGENT_EARNING'
  | 'MARKETING';

export type NotificationCategory = 'welcome' | 'transaction' | 'system' | 'marketing';
export type NotificationPriority = 'high' | 'normal' | 'low';

@Entity('user_notifications')
@Index(['userId', 'isRead', 'createdAt'])
@Index(['userId', 'category', 'createdAt'])
export class UserNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '通知类型',
  })
  type: NotificationType;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'system',
    comment: '通知分类: welcome/transaction/system/marketing',
  })
  category: NotificationCategory;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'normal',
    comment: '优先级: high/normal/low',
  })
  priority: NotificationPriority;

  @Column({
    type: 'varchar',
    length: 200,
    comment: '通知标题',
  })
  title: string;

  @Column({
    type: 'text',
    comment: '通知内容',
  })
  content: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '关联ID (如订单ID)',
  })
  relatedId: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '关联类型 (如 deposit_order)',
  })
  relatedType: string | null;

  @Column({
    type: 'text',
    nullable: true,
    comment: '额外数据 (JSON)',
  })
  extra: string | null;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否已读',
  })
  isRead: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '阅读时间',
  })
  readAt: Date | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '过期时间',
  })
  expireAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
