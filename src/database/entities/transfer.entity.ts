import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum TransferStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  fromUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'fromUserId' })
  fromUser: User;

  @Column({ type: 'uuid' })
  toUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'toUserId' })
  toUser: User;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ length: 255, nullable: true })
  remark: string;

  @Column({
    type: 'enum',
    enum: TransferStatus,
    default: TransferStatus.COMPLETED,
  })
  status: TransferStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date;
}
