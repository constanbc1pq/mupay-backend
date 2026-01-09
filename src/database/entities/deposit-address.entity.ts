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
import { NetworkType } from './deposit-order.entity';

export { NetworkType };

@Entity('deposit_addresses')
@Unique(['userId', 'network'])
@Index(['address', 'network'])
export class DepositAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ['TRC20', 'ERC20', 'BEP20'],
    comment: '网络类型',
  })
  network: NetworkType;

  @Column({ length: 100, comment: '充值地址' })
  address: string;

  @Column({ type: 'int', comment: 'HD Wallet 派生索引' })
  derivationIndex: number;

  @Column({ length: 100, nullable: true, comment: '派生路径' })
  derivationPath: string;

  @Column({ type: 'boolean', default: true, comment: '是否激活' })
  isActive: boolean;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 6,
    default: 0,
    comment: '累计收款金额',
  })
  totalReceived: number;

  @Column({ type: 'int', default: 0, comment: '累计收款次数' })
  totalTransactions: number;

  @Column({ type: 'timestamp', nullable: true, comment: '最后收款时间' })
  lastReceivedAt: Date;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 6,
    default: 0,
    comment: '累计归集金额',
  })
  totalSwept: number;

  @Column({ type: 'timestamp', nullable: true, comment: '最后归集时间' })
  lastSweptAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
