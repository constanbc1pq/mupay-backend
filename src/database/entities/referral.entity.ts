import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Agent } from './agent.entity';
import { User } from './user.entity';

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  agentId: string;

  @ManyToOne(() => Agent)
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({ type: 'uuid' })
  referredUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'referredUserId' })
  referredUser: User;

  @Column({ type: 'tinyint', comment: '推荐层级: 1-直接推荐, 2-二级推荐' })
  level: number;

  @CreateDateColumn()
  createdAt: Date;
}
