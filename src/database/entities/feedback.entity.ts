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

export enum FeedbackType {
  BUG = 'bug',
  FEATURE = 'feature',
  COMPLAINT = 'complaint',
  SUGGESTION = 'suggestion',
  OTHER = 'other',
}

export enum FeedbackStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  REPLIED = 'replied',
  CLOSED = 'closed',
}

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: FeedbackType,
    default: FeedbackType.OTHER,
  })
  type: FeedbackType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-array', nullable: true, comment: '图片URL列表' })
  images: string[];

  @Column({
    type: 'enum',
    enum: FeedbackStatus,
    default: FeedbackStatus.PENDING,
  })
  status: FeedbackStatus;

  @Column({ type: 'text', nullable: true })
  reply: string;

  @Column({ type: 'uuid', nullable: true })
  repliedBy: string;

  @Column({ type: 'datetime', nullable: true })
  repliedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
