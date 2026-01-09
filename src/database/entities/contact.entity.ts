import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  contactUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'contactUserId' })
  contactUser: User;

  @Column({ length: 50, nullable: true })
  remark: string;

  @CreateDateColumn()
  createdAt: Date;
}
