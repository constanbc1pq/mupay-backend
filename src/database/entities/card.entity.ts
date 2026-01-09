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

export enum CardType {
  ENJOY = 'enjoy',
  UNIVERSAL = 'universal',
}

export enum CardLevel {
  REGULAR = 'regular',
  SILVER = 'silver',
  GOLD = 'gold',
}

export enum CardStatus {
  ACTIVE = 'active',
  FROZEN = 'frozen',
  EXPIRED = 'expired',
}

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: CardType,
  })
  type: CardType;

  @Column({
    type: 'enum',
    enum: CardLevel,
    default: CardLevel.REGULAR,
  })
  level: CardLevel;

  @Column({ length: 255, comment: '卡号(AES加密)' })
  cardNumber: string;

  @Column({ length: 10, comment: '有效期 MM/YY' })
  expiryDate: string;

  @Column({ length: 255, comment: 'CVV(AES加密)' })
  cvv: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 5000 })
  monthlyLimit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  monthlyUsed: number;

  @Column({
    type: 'enum',
    enum: CardStatus,
    default: CardStatus.ACTIVE,
  })
  status: CardStatus;

  @Column({ type: 'simple-array', nullable: true, comment: '绑定的支付平台' })
  bindings: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
