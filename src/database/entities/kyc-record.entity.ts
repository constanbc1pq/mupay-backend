import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum KycStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum IdType {
  ID_CARD = 'id_card',
  PASSPORT = 'passport',
  DRIVER_LICENSE = 'driver_license',
}

@Entity('kyc_records')
export class KycRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'tinyint', default: 1, comment: 'KYC等级: 1-基础认证, 2-高级认证' })
  level: number;

  @Column({ length: 100, nullable: true, comment: '真实姓名' })
  realName: string;

  @Column({
    type: 'enum',
    enum: IdType,
    nullable: true,
  })
  idType: IdType;

  @Column({ length: 50, nullable: true, comment: '证件号码' })
  idNumber: string;

  @Column({ length: 255, nullable: true, comment: '证件正面照 URL' })
  idFrontUrl: string;

  @Column({ length: 255, nullable: true, comment: '证件反面照 URL' })
  idBackUrl: string;

  @Column({ length: 255, nullable: true, comment: '手持证件照 URL' })
  holdingIdUrl: string;

  @Column({ default: false, comment: '人脸验证是否通过' })
  faceVerified: boolean;

  @Column({
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.PENDING,
  })
  status: KycStatus;

  @Column({ length: 500, nullable: true, comment: '拒绝原因' })
  rejectReason: string;

  @Column({ type: 'uuid', nullable: true, comment: '审核人ID' })
  reviewedBy: string;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
