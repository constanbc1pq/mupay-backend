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
import { CardProvider } from './card-provider.entity';
import { CardProduct, CardForm, CardMode, CardBrand } from './card-product.entity';
import { Cardholder } from './cardholder.entity';

/**
 * 卡类型 (保留兼容)
 * @deprecated 请使用 CardProduct 的 cardForm/cardMode
 */
export enum CardType {
  ENJOY = 'enjoy',
  UNIVERSAL = 'universal',
}

/**
 * 卡等级 (保留兼容)
 * @deprecated 请使用 CardProduct 配置
 */
export enum CardLevel {
  REGULAR = 'regular',
  SILVER = 'silver',
  GOLD = 'gold',
}

/**
 * 卡状态
 */
export enum CardStatus {
  PENDING = 'pending', // 待激活
  ACTIVE = 'active', // 活跃
  FROZEN = 'frozen', // 冻结
  CANCELLED = 'cancelled', // 注销
  EXPIRED = 'expired', // 过期
}

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  // ============ 服务商集成字段 (新增) ============

  @Column({ type: 'uuid', nullable: true, comment: '服务商ID' })
  @Index()
  providerId: string;

  @ManyToOne(() => CardProvider)
  @JoinColumn({ name: 'providerId' })
  provider: CardProvider;

  @Column({ length: 100, nullable: true, comment: '服务商卡ID' })
  @Index()
  providerCardId: string;

  @Column({ type: 'uuid', nullable: true, comment: '卡产品ID' })
  @Index()
  productId: string;

  @ManyToOne(() => CardProduct)
  @JoinColumn({ name: 'productId' })
  product: CardProduct;

  @Column({ type: 'uuid', nullable: true, comment: '持卡人ID' })
  @Index()
  cardholderId: string;

  @ManyToOne(() => Cardholder)
  @JoinColumn({ name: 'cardholderId' })
  cardholder: Cardholder;

  // 新的卡形式/模式/品牌字段
  @Column({
    type: 'enum',
    enum: CardForm,
    nullable: true,
    comment: '卡形式 (virtual/physical)',
  })
  cardForm: CardForm;

  @Column({
    type: 'enum',
    enum: CardMode,
    nullable: true,
    comment: '卡模式 (single/shared)',
  })
  cardMode: CardMode;

  @Column({
    type: 'enum',
    enum: CardBrand,
    nullable: true,
    comment: '卡品牌',
  })
  cardBrand: CardBrand;

  @Column({ length: 10, nullable: true, comment: '货币代码' })
  currency: string;

  // ============ 原有字段 (保留兼容) ============

  /**
   * @deprecated 请使用 CardProduct 配置
   */
  @Column({
    type: 'enum',
    enum: CardType,
    nullable: true,
  })
  type: CardType;

  /**
   * @deprecated 请使用 CardProduct 配置
   */
  @Column({
    type: 'enum',
    enum: CardLevel,
    default: CardLevel.REGULAR,
    nullable: true,
  })
  level: CardLevel;

  @Column({ length: 255, comment: '卡号(AES加密)' })
  cardNumber: string;

  @Column({ length: 20, nullable: true, comment: '卡号后4位 (用于显示)' })
  cardNumberLast4: string;

  @Column({ length: 10, comment: '有效期 MM/YY' })
  expiryDate: string;

  @Column({ length: 255, comment: 'CVV(AES加密)' })
  cvv: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, comment: '卡余额' })
  balance: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, comment: '可用余额' })
  availableBalance: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 10000, comment: '单日限额' })
  dailyLimit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, comment: '当日已用' })
  dailyUsed: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 50000, comment: '单月限额' })
  monthlyLimit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, comment: '当月已用' })
  monthlyUsed: number;

  @Column({
    type: 'enum',
    enum: CardStatus,
    default: CardStatus.PENDING,
    comment: '卡状态',
  })
  status: CardStatus;

  @Column({ length: 255, nullable: true, comment: '状态变更原因' })
  statusReason: string;

  @Column({ type: 'simple-array', nullable: true, comment: '绑定的支付平台' })
  bindings: string[];

  // ============ 时间戳字段 ============

  @Column({ type: 'datetime', nullable: true, comment: '激活时间' })
  activatedAt: Date;

  @Column({ type: 'datetime', nullable: true, comment: '最后同步时间' })
  lastSyncAt: Date;

  // 服务商返回的元数据
  @Column({ type: 'json', nullable: true, comment: '服务商元数据 (JSON)' })
  providerMetadata: Record<string, any>;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
