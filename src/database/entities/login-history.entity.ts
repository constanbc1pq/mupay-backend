import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum LoginStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  BLOCKED = 'blocked',
}

@Entity('login_history')
export class LoginHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 50, nullable: true, comment: 'IP地址' })
  ip: string;

  @Column({ length: 200, nullable: true, comment: '设备信息' })
  device: string;

  @Column({ length: 100, nullable: true, comment: '位置' })
  location: string;

  @Column({
    type: 'enum',
    enum: LoginStatus,
    default: LoginStatus.SUCCESS,
  })
  status: LoginStatus;

  @Column({ length: 200, nullable: true, comment: '失败原因' })
  failReason: string;

  @CreateDateColumn()
  createdAt: Date;
}
