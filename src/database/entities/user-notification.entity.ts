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
  | 'DEPOSIT_SUCCESS'
  | 'DEPOSIT_FAILED'
  | 'DEPOSIT_CONFIRMING'
  | 'WITHDRAW_SUCCESS'
  | 'WITHDRAW_FAILED'
  | 'TRANSFER_RECEIVED'
  | 'CARD_APPLIED'
  | 'CARD_RECHARGED'
  | 'SYSTEM_NOTICE'
  | 'AGENT_EARNING';

@Entity('user_notifications')
@Index(['userId', 'isRead', 'createdAt'])
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

  @CreateDateColumn()
  createdAt: Date;
}
