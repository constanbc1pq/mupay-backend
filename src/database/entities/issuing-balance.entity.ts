import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { CardProvider } from './card-provider.entity';

/**
 * 发行余额状态
 */
export enum IssuingBalanceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/**
 * 发行余额实体
 * 存储各服务商的发行余额信息
 * 一个服务商可以有多个货币的余额
 */
@Entity('issuing_balances')
@Unique(['providerId', 'currency'])
export class IssuingBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', comment: '服务商ID' })
  @Index()
  providerId: string;

  @ManyToOne(() => CardProvider)
  @JoinColumn({ name: 'providerId' })
  provider: CardProvider;

  @Column({ length: 100, nullable: true, comment: '服务商余额ID' })
  providerBalanceId: string;

  @Column({ length: 10, comment: '货币代码' })
  currency: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    comment: '可用余额',
  })
  availableBalance: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    comment: '冻结余额',
  })
  frozenBalance: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    comment: '保证金余额',
  })
  marginBalance: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    comment: '总余额 (可用+冻结)',
  })
  totalBalance: number;

  @Column({
    type: 'enum',
    enum: IssuingBalanceStatus,
    default: IssuingBalanceStatus.ACTIVE,
    comment: '状态',
  })
  status: IssuingBalanceStatus;

  // 预警配置
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 1000,
    comment: '余额预警阈值',
  })
  alertThreshold: number;

  @Column({ type: 'boolean', default: true, comment: '是否启用预警' })
  alertEnabled: boolean;

  @Column({ type: 'datetime', nullable: true, comment: '最后交易时间' })
  lastTradeTime: Date;

  @Column({ type: 'datetime', nullable: true, comment: '最后同步时间' })
  lastSyncAt: Date;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
