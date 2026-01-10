import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity('faq_categories')
export class FaqCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, nullable: true, comment: '翻译键' })
  nameKey: string;

  @Column({ length: 50, nullable: true, comment: '图标' })
  icon: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => FaqItem, item => item.category)
  items: FaqItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('faq_items')
export class FaqItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => FaqCategory, category => category.items)
  @JoinColumn({ name: 'categoryId' })
  category: FaqCategory;

  @Column({ length: 500 })
  question: string;

  @Column({ length: 500, nullable: true, comment: '问题翻译键' })
  questionKey: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ length: 500, nullable: true, comment: '答案翻译键' })
  answerKey: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'int', default: 0, comment: '浏览次数' })
  viewCount: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
