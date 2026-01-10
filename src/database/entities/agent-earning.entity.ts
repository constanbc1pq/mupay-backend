import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Agent } from './agent.entity';
import { User } from './user.entity';
import { CardProvider } from './card-provider.entity';

export enum EarningType {
  CARD_OPEN = 'card_open',
  MONTHLY_FEE = 'monthly_fee',
  CARD_RECHARGE = 'card_recharge',
  REMITTANCE = 'remittance',
}

@Entity('agent_earnings')
export class AgentEarning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  agentId: string;

  @ManyToOne(() => Agent)
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({
    type: 'enum',
    enum: EarningType,
  })
  type: EarningType;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'uuid' })
  fromUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'fromUserId' })
  fromUser: User;

  @Column({ type: 'tinyint', comment: '收益来源层级: 1-一级, 2-二级' })
  level: number;

  @Column({ type: 'uuid', nullable: true })
  relatedOrderId: string;

  @Column({ type: 'uuid', nullable: true, comment: '关联服务商ID' })
  @Index()
  providerId: string;

  @ManyToOne(() => CardProvider, { nullable: true })
  @JoinColumn({ name: 'providerId' })
  provider: CardProvider;

  @CreateDateColumn()
  createdAt: Date;
}
