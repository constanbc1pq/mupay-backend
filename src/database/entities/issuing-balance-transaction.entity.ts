import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CardProvider } from './card-provider.entity';
import { IssuingBalance } from './issuing-balance.entity';
import { Card } from './card.entity';
import { User } from './user.entity';

/**
 * 发行余额交易类型
 */
export enum IssuingBalanceTransactionType {
  DEPOSIT = 'deposit', // 充值
  WITHDRAW = 'withdraw', // 提现
  CARD_LOAD = 'card_load', // 卡片充值 (余额减少)
  CARD_UNLOAD = 'card_unload', // 卡片提现 (余额增加)
  FEE = 'fee', // 手续费
  ADJUSTMENT = 'adjustment', // 调账
  TRANSFER_IN = 'transfer_in', // 转入
  TRANSFER_OUT = 'transfer_out', // 转出
}

/**
 * 发行余额交易状态
 */
export enum IssuingBalanceTransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * 发行余额交易实体
 * 记录发行余额的变动历史
 */
@Entity('issuing_balance_transactions')
export class IssuingBalanceTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', comment: '服务商ID' })
  @Index()
  providerId: string;

  @ManyToOne(() => CardProvider)
  @JoinColumn({ name: 'providerId' })
  provider: CardProvider;

  @Column({ type: 'uuid', comment: '余额ID' })
  @Index()
  balanceId: string;

  @ManyToOne(() => IssuingBalance)
  @JoinColumn({ name: 'balanceId' })
  balance: IssuingBalance;

  @Column({ length: 100, nullable: true, comment: '服务商交易ID' })
  @Index()
  providerTransactionId: string;

  @Column({ length: 100, nullable: true, comment: '服务商短交易ID' })
  shortTransactionId: string;

  @Column({
    type: 'enum',
    enum: IssuingBalanceTransactionType,
    comment: '交易类型',
  })
  type: IssuingBalanceTransactionType;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    comment: '交易金额',
  })
  amount: number;

  @Column({ length: 10, comment: '货币代码' })
  currency: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    comment: '交易后余额',
  })
  endingBalance: number;

  @Column({
    type: 'enum',
    enum: IssuingBalanceTransactionStatus,
    default: IssuingBalanceTransactionStatus.PENDING,
    comment: '交易状态',
  })
  status: IssuingBalanceTransactionStatus;

  @Column({ length: 500, nullable: true, comment: '描述/备注' })
  description: string;

  // 关联的卡片 (如果是卡片充值/提现)
  @Column({ type: 'uuid', nullable: true, comment: '关联卡片ID' })
  relatedCardId: string;

  @ManyToOne(() => Card)
  @JoinColumn({ name: 'relatedCardId' })
  relatedCard: Card;

  // 关联的用户 (如果是用户操作)
  @Column({ type: 'uuid', nullable: true, comment: '关联用户ID' })
  relatedUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'relatedUserId' })
  relatedUser: User;

  // 时间
  @Column({ type: 'datetime', comment: '交易时间' })
  @Index()
  transactionTime: Date;

  @Column({ type: 'datetime', nullable: true, comment: '完成时间' })
  completedAt: Date;

  // 服务商元数据
  @Column({ type: 'json', nullable: true, comment: '服务商元数据 (JSON)' })
  providerMetadata: Record<string, any>;

  @CreateDateColumn({ comment: '记录创建时间' })
  createdAt: Date;
}
