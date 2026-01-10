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
import { CardProvider } from './card-provider.entity';

/**
 * 卡形式
 */
export enum CardForm {
  VIRTUAL = 'virtual',
  PHYSICAL = 'physical',
}

/**
 * 卡模式
 */
export enum CardMode {
  SINGLE = 'single', // 独享卡
  SHARED = 'shared', // 共享卡
}

/**
 * 卡品牌
 */
export enum CardBrand {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  UNIONPAY = 'unionpay',
}

/**
 * 卡产品状态
 */
export enum CardProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
}

/**
 * U卡产品实体
 * 存储各服务商的卡产品信息
 */
@Entity('card_products')
export class CardProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', comment: '服务商ID' })
  @Index()
  providerId: string;

  @ManyToOne(() => CardProvider)
  @JoinColumn({ name: 'providerId' })
  provider: CardProvider;

  @Column({ length: 100, comment: '服务商产品ID' })
  @Index()
  providerProductId: string;

  @Column({ length: 100, comment: '产品名称' })
  name: string;

  @Column({ length: 500, nullable: true, comment: '产品描述' })
  description: string;

  @Column({
    type: 'enum',
    enum: CardForm,
    comment: '卡形式',
  })
  cardForm: CardForm;

  @Column({
    type: 'enum',
    enum: CardMode,
    comment: '卡模式',
  })
  cardMode: CardMode;

  @Column({
    type: 'enum',
    enum: CardBrand,
    comment: '卡品牌',
  })
  cardBrand: CardBrand;

  @Column({ length: 20, nullable: true, comment: '卡BIN' })
  cardBin: string;

  @Column({ type: 'simple-array', comment: '支持的货币' })
  currencies: string[];

  // 费用配置 (覆盖服务商默认配置)
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    comment: '开卡费 (固定金额)',
  })
  openFee: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    comment: '月费 (固定金额)',
  })
  monthlyFee: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 0,
    comment: '充值费率 (%)',
  })
  rechargeRate: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 0,
    comment: '提现费率 (%)',
  })
  withdrawRate: number;

  // 限额配置
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    comment: '最小充值金额',
  })
  minDeposit: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
    comment: '最大充值金额',
  })
  maxDeposit: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 10000,
    comment: '单日限额',
  })
  dailyLimit: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 50000,
    comment: '单月限额',
  })
  monthlyLimit: number;

  @Column({ type: 'int', nullable: true, comment: '最大开卡数量' })
  maxCardQuota: number;

  // 地区限制
  @Column({ type: 'json', nullable: true, comment: '支持的地区/国家 (JSON数组)' })
  regions: string[];

  // 功能特性
  @Column({ type: 'json', nullable: true, comment: '产品特性 (JSON数组)' })
  features: string[];

  // KYC 要求
  @Column({ type: 'int', default: 1, comment: '要求的最低KYC等级' })
  requiredKycLevel: number;

  @Column({
    type: 'enum',
    enum: CardProductStatus,
    default: CardProductStatus.ACTIVE,
    comment: '状态',
  })
  status: CardProductStatus;

  // 排序和展示
  @Column({ type: 'int', default: 100, comment: '排序权重' })
  sortOrder: number;

  @Column({ type: 'boolean', default: true, comment: '是否在前端展示' })
  isVisible: boolean;

  // 扩展配置
  @Column({ type: 'json', nullable: true, comment: '扩展配置 (JSON)' })
  extraConfig: Record<string, any>;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
