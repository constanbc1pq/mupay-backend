import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export type DepositMethod = 'CRYPTO' | 'CARD' | 'PAYPAL';
export type DepositStatus =
  | 'PENDING'
  | 'CONFIRMING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';
export type NetworkType = 'TRC20' | 'ERC20' | 'BEP20';

@Entity('deposit_orders')
@Index(['orderNo'], { unique: true })
@Index(['userId', 'status'])
@Index(['method', 'status'])
@Index(['txHash'])
export class DepositOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 50, comment: '订单号' })
  orderNo: string;

  @Column({
    type: 'enum',
    enum: ['CRYPTO', 'CARD', 'PAYPAL'],
    comment: '充值方式',
  })
  method: DepositMethod;

  @Column({
    type: 'enum',
    enum: ['TRC20', 'ERC20', 'BEP20'],
    nullable: true,
    comment: '网络类型 (仅加密货币)',
  })
  network: NetworkType;

  @Column({ length: 100, nullable: true, comment: '交易哈希 (仅加密货币)' })
  txHash: string;

  @Column({ length: 100, nullable: true, comment: '发送地址' })
  fromAddress: string;

  @Column({ length: 100, nullable: true, comment: '接收地址' })
  toAddress: string;

  @Column({ type: 'bigint', nullable: true, comment: '区块高度' })
  blockNumber: number;

  @Column({ type: 'int', default: 0, comment: '确认数' })
  confirmations: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 6,
    comment: '充值金额 (USDT)',
  })
  amount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 6,
    default: 0,
    comment: '手续费',
  })
  fee: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 6,
    default: 0,
    comment: '实际到账金额',
  })
  netAmount: number;

  @Column({ length: 10, default: 'USDT', comment: '币种' })
  currency: string;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'],
    default: 'PENDING',
    comment: '订单状态',
  })
  status: DepositStatus;

  @Column({ length: 255, nullable: true, comment: '状态备注/失败原因' })
  statusRemark: string;

  // Stripe/PayPal specific fields
  @Column({ length: 100, nullable: true, comment: 'Stripe PaymentIntent ID' })
  stripePaymentIntentId: string;

  @Column({ length: 100, nullable: true, comment: 'PayPal Order ID' })
  paypalOrderId: string;

  @Column({ type: 'timestamp', nullable: true, comment: '确认时间' })
  confirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true, comment: '完成时间' })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true, comment: '过期时间' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
