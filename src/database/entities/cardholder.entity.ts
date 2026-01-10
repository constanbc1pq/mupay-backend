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
import { User } from './user.entity';
import { CardProvider } from './card-provider.entity';

/**
 * 证件类型
 */
export enum CardholderIdType {
  PASSPORT = 'passport',
  ID_CARD = 'id_card',
  DRIVING_LICENSE = 'driving_license',
}

/**
 * 持卡人KYC状态
 */
export enum CardholderKycStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NOT_REQUIRED = 'not_required',
}

/**
 * 持卡人状态
 */
export enum CardholderStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

/**
 * 持卡人实体
 * 存储用户在各服务商的持卡人信息
 * 一个用户可以在多个服务商有持卡人身份
 */
@Entity('cardholders')
@Unique(['userId', 'providerId']) // 每个用户在每个服务商只能有一个持卡人身份
export class Cardholder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', comment: '用户ID' })
  @Index()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', comment: '服务商ID' })
  @Index()
  providerId: string;

  @ManyToOne(() => CardProvider)
  @JoinColumn({ name: 'providerId' })
  provider: CardProvider;

  @Column({ length: 100, comment: '服务商持卡人ID' })
  @Index()
  providerCardholderId: string;

  // 基本信息
  @Column({ length: 100, comment: '名' })
  firstName: string;

  @Column({ length: 100, comment: '姓' })
  lastName: string;

  @Column({ length: 255, comment: '邮箱' })
  email: string;

  @Column({ length: 50, nullable: true, comment: '电话' })
  phone: string;

  // 证件信息
  @Column({
    type: 'enum',
    enum: CardholderIdType,
    default: CardholderIdType.PASSPORT,
    comment: '证件类型',
  })
  idType: CardholderIdType;

  @Column({ length: 100, nullable: true, comment: '证件号码 (加密存储)' })
  idNumber: string;

  @Column({ length: 10, nullable: true, comment: '国籍 (ISO 3166-1 alpha-2)' })
  nationality: string;

  @Column({ type: 'date', nullable: true, comment: '出生日期' })
  dateOfBirth: Date;

  // 地址信息
  @Column({ length: 255, nullable: true, comment: '地址行1' })
  addressLine1: string;

  @Column({ length: 255, nullable: true, comment: '地址行2' })
  addressLine2: string;

  @Column({ length: 100, nullable: true, comment: '城市' })
  city: string;

  @Column({ length: 100, nullable: true, comment: '州/省' })
  state: string;

  @Column({ length: 10, nullable: true, comment: '国家代码' })
  country: string;

  @Column({ length: 20, nullable: true, comment: '邮编' })
  postalCode: string;

  // KYC 状态
  @Column({
    type: 'enum',
    enum: CardholderKycStatus,
    default: CardholderKycStatus.PENDING,
    comment: 'KYC状态',
  })
  kycStatus: CardholderKycStatus;

  @Column({ type: 'int', default: 0, comment: 'KYC等级' })
  kycLevel: number;

  @Column({
    type: 'enum',
    enum: CardholderStatus,
    default: CardholderStatus.INACTIVE,
    comment: '持卡人状态',
  })
  status: CardholderStatus;

  // 卡片统计
  @Column({ type: 'int', default: 0, comment: '持有卡片数量' })
  numberOfCards: number;

  // 服务商返回的元数据
  @Column({ type: 'json', nullable: true, comment: '服务商元数据 (JSON)' })
  providerMetadata: Record<string, any>;

  // 最后同步时间
  @Column({ type: 'datetime', nullable: true, comment: '最后同步时间' })
  lastSyncAt: Date;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
