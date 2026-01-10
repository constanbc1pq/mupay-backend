import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TemplateType = 'welcome' | 'transaction' | 'system' | 'marketing';

@Entity('message_templates')
export class MessageTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    comment: '模板编码',
  })
  code: string;

  @Column({
    type: 'varchar',
    length: 200,
    comment: '模板标题',
  })
  title: string;

  @Column({
    type: 'text',
    comment: '模板内容 (支持 {{variable}} 占位符)',
  })
  content: string;

  @Column({
    type: 'varchar',
    length: 20,
    comment: '模板类型: welcome/transaction/system/marketing',
  })
  type: TemplateType;

  @Column({
    type: 'text',
    nullable: true,
    comment: '支持的变量列表 (JSON)',
  })
  variables: string | null;

  @Column({
    type: 'boolean',
    default: true,
    comment: '是否启用',
  })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
