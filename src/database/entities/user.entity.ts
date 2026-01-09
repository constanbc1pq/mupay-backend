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

  @Column({ default: false })
  isAgent: boolean;

  @Column({ length: 255, nullable: true, comment: '支付密码(bcrypt加密)' })
  paymentPassword: string;

  @Column({ length: 100, nullable: true, unique: true, comment: 'Google账号ID' })
  googleId: string;

  @Column({
    type: 'enum',
    enum: ['active', 'disabled', 'deleted'],
    default: 'active',
  })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
