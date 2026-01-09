import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum RemittanceStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('remittances')
export class Remittance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 10 })
  countryCode: string;

  @Column({ length: 20 })
  bankCode: string;

  @Column({ length: 100 })
  accountName: string;

  @Column({ length: 50 })
  accountNumber: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  fee: number;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  rate: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  localAmount: number;

  @Column({
    type: 'enum',
    enum: RemittanceStatus,
    default: RemittanceStatus.PENDING,
  })
  status: RemittanceStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date;
}
