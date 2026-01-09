import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('mobile_operators')
export class MobileOperator {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 10 })
  countryCode: string;

  @Column({ length: 10, nullable: true })
  icon: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
