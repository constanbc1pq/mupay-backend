import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CardProvider } from './card-provider.entity';

/**
 * 代理政策状态
 */
export enum AgentPolicyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/**
 * 代理商政策实体
 * 定义各服务商的代理佣金政策
 */
@Entity('agent_policies')
export class AgentPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', comment: '关联服务商ID' })
  providerId: string;

  @ManyToOne(() => CardProvider)
  @JoinColumn({ name: 'providerId' })
  provider: CardProvider;

  @Column({ length: 100, comment: '政策名称' })
  name: string;

  @Column({ length: 500, nullable: true, comment: '政策描述' })
  description: string;

  // 佣金费率 (百分比，如 0.05 表示 5%)
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 0,
    comment: '开卡佣金费率',
  })
  cardOpenCommissionRate: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 0,
    comment: '月费佣金费率',
  })
  monthlyFeeCommissionRate: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 0,
    comment: '充值佣金费率',
  })
  rechargeCommissionRate: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 0,
    comment: '交易佣金费率',
  })
  transactionCommissionRate: number;

  // 分级佣金比例 (一级代理获得的比例)
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 1.0,
    comment: '一级代理佣金比例 (如 1.0 表示100%)',
  })
  level1Rate: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 0.1,
    comment: '二级代理佣金比例 (如 0.1 表示10%)',
  })
  level2Rate: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 10,
    comment: '最低提现金额',
  })
  minPayout: number;

  @Column({
    type: 'enum',
    enum: AgentPolicyStatus,
    default: AgentPolicyStatus.ACTIVE,
    comment: '政策状态',
  })
  status: AgentPolicyStatus;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
