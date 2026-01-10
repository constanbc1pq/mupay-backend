import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_devices')
export class UserDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 100, comment: '设备唯一标识' })
  deviceId: string;

  @Column({ length: 100, nullable: true, comment: '设备名称' })
  deviceName: string;

  @Column({ length: 50, nullable: true, comment: '设备类型: mobile/tablet/desktop' })
  deviceType: string;

  @Column({ length: 100, nullable: true, comment: '操作系统' })
  os: string;

  @Column({ length: 50, nullable: true, comment: '浏览器或客户端' })
  browser: string;

  @Column({ length: 50, nullable: true, comment: 'IP地址' })
  ip: string;

  @Column({ length: 100, nullable: true, comment: '位置' })
  location: string;

  @Column({ type: 'datetime', nullable: true })
  lastActiveAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
