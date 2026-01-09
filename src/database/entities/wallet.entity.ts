import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, comment: '冻结金额' })
  frozenBalance: number;

  @Column({ length: 100, nullable: true, comment: 'TRC20充值地址' })
  depositAddressTRC20: string;

  @Column({ length: 100, nullable: true, comment: 'ERC20充值地址' })
  depositAddressERC20: string;

  @Column({ length: 100, nullable: true, comment: 'BEP20充值地址' })
  depositAddressBEP20: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
