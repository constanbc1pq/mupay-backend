import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('exchange_rates')
export class ExchangeRate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true, comment: '如 USDT_CNY' })
  pair: string;

  @Column({ type: 'decimal', precision: 18, scale: 6 })
  rate: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
