import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Card } from './card.entity';

export enum CardRechargeStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('card_recharges')
export class CardRecharge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  cardId: string;

  @ManyToOne(() => Card)
  @JoinColumn({ name: 'cardId' })
  card: Card;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  fee: number;

  @Column({
    type: 'enum',
    enum: CardRechargeStatus,
    default: CardRechargeStatus.PENDING,
  })
  status: CardRechargeStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date;
}
