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

export enum AgentStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 20, unique: true })
  inviteCode: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalEarnings: number;

  @Column({
    type: 'enum',
    enum: AgentStatus,
    default: AgentStatus.ACTIVE,
  })
  status: AgentStatus;

  @Column({ type: 'datetime' })
  applyTime: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
