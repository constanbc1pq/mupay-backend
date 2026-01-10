import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Card } from './card.entity';
import { CardProvider } from './card-provider.entity';

/**
 * 卡交易类型
 */
export enum CardTransactionType {
  AUTHORIZATION = 'authorization', // 预授权
  PURCHASE = 'purchase', // 消费/结算
  REFUND = 'refund', // 退款
  REVERSAL = 'reversal', // 撤销
  ATM = 'atm', // ATM取款
  FEE = 'fee', // 手续费
  ADJUSTMENT = 'adjustment', // 调账
}

/**
 * 卡交易状态
 */
export enum CardTransactionStatus {
  PENDING = 'pending', // 待处理
  COMPLETED = 'completed', // 已完成
  DECLINED = 'declined', // 已拒绝
  REVERSED = 'reversed', // 已撤销
}

/**
 * 卡交易实体
 * 存储卡片消费/退款等交易记录
 */
@Entity('card_transactions')
export class CardTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', comment: '卡片ID' })
  @Index()
  cardId: string;

  @ManyToOne(() => Card)
  @JoinColumn({ name: 'cardId' })
  card: Card;

  @Column({ type: 'uuid', comment: '服务商ID' })
  @Index()
  providerId: string;

  @ManyToOne(() => CardProvider)
  @JoinColumn({ name: 'providerId' })
  provider: CardProvider;

  @Column({ length: 100, comment: '服务商交易ID' })
  @Index()
  providerTransactionId: string;

  @Column({ length: 100, nullable: true, comment: '服务商短交易ID' })
  shortTransactionId: string;

  @Column({ length: 100, nullable: true, comment: '原交易ID (退款/撤销时关联)' })
  originalTransactionId: string;

  @Column({
    type: 'enum',
    enum: CardTransactionType,
    comment: '交易类型',
  })
  type: CardTransactionType;

  // 交易金额
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    comment: '交易金额 (原始货币)',
  })
  amount: number;

  @Column({ length: 10, comment: '交易货币' })
  currency: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
    comment: '账单金额 (结算货币)',
  })
  billingAmount: number;

  @Column({ length: 10, nullable: true, comment: '账单货币' })
  billingCurrency: string;

  // 手续费
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
    comment: '交易手续费',
  })
  fee: number;

  @Column({ length: 10, nullable: true, comment: '手续费货币' })
  feeCurrency: string;

  // 商户信息
  @Column({ length: 255, nullable: true, comment: '商户名称' })
  merchantName: string;

  @Column({ length: 10, nullable: true, comment: '商户类别码 (MCC)' })
  merchantCategory: string;

  @Column({ length: 100, nullable: true, comment: '商户城市' })
  merchantCity: string;

  @Column({ length: 10, nullable: true, comment: '商户国家' })
  merchantCountry: string;

  // 状态
  @Column({
    type: 'enum',
    enum: CardTransactionStatus,
    default: CardTransactionStatus.PENDING,
    comment: '交易状态',
  })
  status: CardTransactionStatus;

  @Column({ length: 500, nullable: true, comment: '拒绝/失败原因' })
  declineReason: string;

  // 卡余额
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
    comment: '交易后卡可用余额',
  })
  cardBalanceAfter: number;

  // 授权码
  @Column({ length: 20, nullable: true, comment: '授权码' })
  authorizationCode: string;

  // 支付方式
  @Column({ length: 50, nullable: true, comment: '钱包类型 (ApplePay等)' })
  walletType: string;

  // 时间
  @Column({ type: 'datetime', comment: '交易时间' })
  @Index()
  transactionTime: Date;

  @Column({ type: 'datetime', nullable: true, comment: '过账时间' })
  postedTime: Date;

  // 服务商元数据
  @Column({ type: 'json', nullable: true, comment: '服务商元数据 (JSON)' })
  providerMetadata: Record<string, any>;

  @CreateDateColumn({ comment: '记录创建时间' })
  createdAt: Date;
}
