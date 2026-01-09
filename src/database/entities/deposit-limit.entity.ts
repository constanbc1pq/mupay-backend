import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type LimitPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type LimitScope = 'GLOBAL' | 'USER' | 'VIP_LEVEL';

@Entity('deposit_limits')
@Index(['method', 'network', 'scope', 'scopeValue'])
export class DepositLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ['CRYPTO', 'CARD', 'PAYPAL'],
    nullable: true,
    comment: '充值方式 (null 表示全部)',
  })
  method: 'CRYPTO' | 'CARD' | 'PAYPAL' | null;

  @Column({
    type: 'enum',
    enum: ['TRC20', 'ERC20', 'BEP20'],
    nullable: true,
    comment: '网络类型 (null 表示全部)',
  })
  network: 'TRC20' | 'ERC20' | 'BEP20' | null;

  @Column({
    type: 'enum',
    enum: ['GLOBAL', 'USER', 'VIP_LEVEL'],
    default: 'GLOBAL',
    comment: '限额范围',
  })
  scope: LimitScope;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '范围值 (用户ID 或 VIP等级)',
  })
  scopeValue: string | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    comment: '单笔最小金额',
  })
  minAmount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    comment: '单笔最大金额',
  })
  maxAmount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    comment: '每日限额 (0 表示不限制)',
  })
  dailyLimit: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    comment: '每周限额 (0 表示不限制)',
  })
  weeklyLimit: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    comment: '每月限额 (0 表示不限制)',
  })
  monthlyLimit: number;

  @Column({
    type: 'int',
    default: 0,
    comment: '每日次数限制 (0 表示不限制)',
  })
  dailyCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: '每周次数限制 (0 表示不限制)',
  })
  weeklyCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: '每月次数限制 (0 表示不限制)',
  })
  monthlyCount: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: '是否启用',
  })
  isEnabled: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: '优先级 (数字越大优先级越高)',
  })
  priority: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: '备注',
  })
  remark: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
