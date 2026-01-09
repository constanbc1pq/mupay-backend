import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  username: string;

  @Column({ length: 255 })
  password: string;

  @Column({
    type: 'enum',
    enum: ['super_admin', 'admin', 'operator'],
    default: 'operator',
  })
  role: string;

  @Column({
    type: 'enum',
    enum: ['active', 'disabled'],
    default: 'active',
  })
  status: string;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
