import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum WithdrawStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum WithdrawNetwork {
  TRC20 = 'TRC20',
  ERC20 = 'ERC20',
  BEP20 = 'BEP20',
}

@Entity('usdt_withdraws')
export class UsdtWithdraw {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: WithdrawNetwork,
  })
  network: WithdrawNetwork;

  @Column({ length: 100 })
  address: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  fee: number;

  @Column({
    type: 'enum',
    enum: WithdrawStatus,
    default: WithdrawStatus.PENDING,
  })
  status: WithdrawStatus;

  @Column({ length: 100, nullable: true })
  txHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date;
}
