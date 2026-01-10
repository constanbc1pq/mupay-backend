import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum DeletionStatus {
  PENDING = 'pending',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('account_deletions')
export class AccountDeletion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: DeletionStatus,
    default: DeletionStatus.PENDING,
  })
  status: DeletionStatus;

  @Column({ length: 500, nullable: true, comment: '注销原因' })
  reason: string;

  @CreateDateColumn({ comment: '申请时间' })
  requestedAt: Date;

  @Column({ type: 'datetime', comment: '计划执行时间 (7天后)' })
  scheduledAt: Date;

  @Column({ type: 'datetime', nullable: true, comment: '撤销时间' })
  cancelledAt: Date;

  @Column({ type: 'datetime', nullable: true, comment: '完成时间' })
  completedAt: Date;
}
