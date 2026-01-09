import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type AuditAction =
  | 'ORDER_CREATED'
  | 'ORDER_CONFIRMING'
  | 'ORDER_COMPLETED'
  | 'ORDER_FAILED'
  | 'ORDER_CANCELLED'
  | 'ORDER_EXPIRED'
  | 'WEBHOOK_RECEIVED'
  | 'WEBHOOK_PROCESSED'
  | 'WEBHOOK_FAILED'
  | 'SWEEP_INITIATED'
  | 'SWEEP_COMPLETED'
  | 'SWEEP_FAILED'
  | 'MANUAL_CONFIRM'
  | 'BALANCE_CREDITED';

@Entity('deposit_audit_logs')
@Index(['orderId', 'createdAt'])
@Index(['action', 'createdAt'])
export class DepositAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, comment: '关联订单ID' })
  orderId: string | null;

  @Column({ type: 'uuid', nullable: true, comment: '关联用户ID' })
  userId: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '操作类型',
  })
  action: AuditAction;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '充值方式',
  })
  method: 'CRYPTO' | 'CARD' | 'PAYPAL' | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '网络类型',
  })
  network: string | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
    comment: '金额',
  })
  amount: number | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '之前状态',
  })
  previousStatus: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '之后状态',
  })
  newStatus: string | null;

  @Column({
    type: 'text',
    nullable: true,
    comment: '详细信息 (JSON)',
  })
  details: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '操作来源 (webhook/job/admin/user)',
  })
  source: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '操作者ID (管理员操作时)',
  })
  operatorId: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'IP地址',
  })
  ipAddress: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
