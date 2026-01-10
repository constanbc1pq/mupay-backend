import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 服务商状态
 */
export enum CardProviderStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
}

/**
 * U卡服务商实体
 * 存储第三方卡服务商的配置信息
 */
@Entity('card_providers')
export class CardProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true, comment: '服务商代码 (如: uqpay)' })
  code: string;

  @Column({ length: 100, comment: '服务商名称' })
  name: string;

  @Column({ length: 500, nullable: true, comment: '服务商描述' })
  description: string;

  @Column({
    type: 'enum',
    enum: CardProviderStatus,
    default: CardProviderStatus.INACTIVE,
    comment: '状态',
  })
  status: CardProviderStatus;

  @Column({ length: 255, comment: 'API 基础地址' })
  apiBaseUrl: string;

  @Column({ length: 500, comment: 'API Key (AES加密存储)' })
  apiKey: string;

  @Column({ length: 500, nullable: true, comment: 'API Secret (AES加密存储)' })
  apiSecret: string;

  @Column({ length: 500, nullable: true, comment: 'Webhook Secret (AES加密存储)' })
  webhookSecret: string;

  @Column({ type: 'int', default: 30000, comment: 'API 请求超时时间 (ms)' })
  timeout: number;

  // 费率配置
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 0,
    comment: '开卡费率 (固定金额或百分比)',
  })
  openFeeRate: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 0,
    comment: '充值费率 (%)',
  })
  rechargeFeeRate: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 0,
    comment: '提现费率 (%)',
  })
  withdrawFeeRate: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 0,
    comment: '月费率 (固定金额)',
  })
  monthlyFeeRate: number;

  // 限额配置
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    comment: '最小充值金额',
  })
  minRecharge: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 100000,
    comment: '最大充值金额',
  })
  maxRecharge: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    comment: '最小提现金额',
  })
  minWithdraw: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 100000,
    comment: '最大提现金额',
  })
  maxWithdraw: number;

  // 支持的卡形式和模式
  @Column({
    type: 'simple-array',
    nullable: true,
    comment: '支持的卡形式 (virtual,physical)',
  })
  supportedCardForms: string[];

  @Column({
    type: 'simple-array',
    nullable: true,
    comment: '支持的卡模式 (single,shared)',
  })
  supportedCardModes: string[];

  @Column({
    type: 'simple-array',
    nullable: true,
    comment: '支持的货币 (USD,SGD)',
  })
  supportedCurrencies: string[];

  // 优先级和权重
  @Column({ type: 'int', default: 100, comment: '优先级 (越小越优先)' })
  priority: number;

  @Column({ type: 'int', default: 100, comment: '路由权重 (用于负载均衡)' })
  weight: number;

  // 健康检查
  @Column({ type: 'datetime', nullable: true, comment: '最后健康检查时间' })
  lastHealthCheckAt: Date;

  @Column({ type: 'boolean', default: true, comment: '健康状态' })
  isHealthy: boolean;

  @Column({ type: 'int', default: 0, comment: '连续失败次数' })
  failureCount: number;

  // 扩展配置
  @Column({ type: 'json', nullable: true, comment: '扩展配置 (JSON)' })
  extraConfig: Record<string, any>;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
