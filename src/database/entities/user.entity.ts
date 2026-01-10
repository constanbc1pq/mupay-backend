import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  username: string;

  @Column({ length: 20, nullable: true, unique: true })
  phone: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ default: false, comment: '邮箱是否已验证' })
  emailVerified: boolean;

  @Column({ length: 255 })
  password: string;

  @Column({ length: 50, nullable: true })
  nickname: string;

  @Column({ length: 255, nullable: true })
  avatar: string;

  @Column({ type: 'tinyint', default: 0, comment: 'KYC等级: 0-未认证, 1-基础认证, 2-高级认证' })
  kycLevel: number;

  @Column({ type: 'tinyint', default: 0, comment: 'VIP等级: 0-普通用户, 1-VIP1, 2-VIP2, ...' })
  vipLevel: number;

  @Column({ default: false })
  isAgent: boolean;

  @Column({ length: 255, nullable: true, comment: '支付密码(bcrypt加密)' })
  paymentPassword: string;

  @Column({ length: 100, nullable: true, unique: true, comment: 'Google账号ID' })
  googleId: string;

  @Column({ length: 100, nullable: true, comment: '2FA密钥' })
  twoFactorSecret: string;

  @Column({ default: false, comment: '是否启用2FA' })
  twoFactorEnabled: boolean;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'suspended', 'disabled', 'deleted'],
    default: 'active',
  })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
