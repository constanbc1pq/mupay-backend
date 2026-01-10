import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FaqCategory, FaqItem } from '@database/entities/faq.entity';
import { Feedback, FeedbackStatus } from '@database/entities/feedback.entity';
import { MSG } from '@common/constants/messages';
import { SubmitFeedbackDto } from './dto/support.dto';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(FaqCategory)
    private categoryRepository: Repository<FaqCategory>,
    @InjectRepository(FaqItem)
    private faqRepository: Repository<FaqItem>,
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
  ) {}

  // ==================== FAQ ====================

  async getCategories() {
    const categories = await this.categoryRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });

    const result = await Promise.all(
      categories.map(async cat => {
        const itemCount = await this.faqRepository.count({
          where: { categoryId: cat.id, isActive: true },
        });
        return {
          id: cat.id,
          name: cat.name,
          nameKey: cat.nameKey,
          icon: cat.icon,
          itemCount,
        };
      }),
    );

    return result;
  }

  async getFaqList(categoryId?: string) {
    const where: any = { isActive: true };
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const items = await this.faqRepository.find({
      where,
      order: { sortOrder: 'ASC', viewCount: 'DESC' },
    });

    return items.map(item => ({
      id: item.id,
      categoryId: item.categoryId,
      question: item.question,
      questionKey: item.questionKey,
      answer: item.answer,
      answerKey: item.answerKey,
      viewCount: item.viewCount,
    }));
  }

  async getFaqDetail(id: string) {
    const item = await this.faqRepository.findOne({
      where: { id, isActive: true },
      relations: ['category'],
    });

    if (!item) {
      throw new NotFoundException(MSG.NOT_FOUND);
    }

    // Increment view count
    item.viewCount += 1;
    await this.faqRepository.save(item);

    return {
      id: item.id,
      categoryId: item.categoryId,
      categoryName: item.category?.name,
      question: item.question,
      questionKey: item.questionKey,
      answer: item.answer,
      answerKey: item.answerKey,
      viewCount: item.viewCount,
    };
  }

  // ==================== Feedback ====================

  async submitFeedback(userId: string, dto: SubmitFeedbackDto) {
    if (dto.images && dto.images.length > 3) {
      throw new BadRequestException(MSG.INVALID_PARAMS);
    }

    const feedback = this.feedbackRepository.create({
      userId,
      type: dto.type,
      content: dto.content,
      images: dto.images || [],
      status: FeedbackStatus.PENDING,
    });

    await this.feedbackRepository.save(feedback);

    return { messageId: MSG.FEEDBACK_SUBMITTED };
  }

  async getUserFeedback(userId: string, page: number = 1, limit: number = 20) {
    const [items, total] = await this.feedbackRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map(f => ({
        id: f.id,
        type: f.type,
        content: f.content,
        images: f.images,
        status: f.status,
        reply: f.reply,
        repliedAt: f.repliedAt,
        createdAt: f.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async getFeedbackDetail(userId: string, feedbackId: string) {
    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId, userId },
    });

    if (!feedback) {
      throw new NotFoundException(MSG.FEEDBACK_NOT_FOUND);
    }

    return {
      id: feedback.id,
      type: feedback.type,
      content: feedback.content,
      images: feedback.images,
      status: feedback.status,
      reply: feedback.reply,
      repliedAt: feedback.repliedAt,
      createdAt: feedback.createdAt,
    };
  }

  // ==================== Admin Methods ====================

  async getAdminFeedbackList(status?: FeedbackStatus, page: number = 1, limit: number = 20) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [items, total] = await this.feedbackRepository.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map(f => ({
        id: f.id,
        userId: f.userId,
        username: f.user?.username,
        email: f.user?.email,
        type: f.type,
        content: f.content,
        images: f.images,
        status: f.status,
        reply: f.reply,
        repliedAt: f.repliedAt,
        createdAt: f.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async replyFeedback(feedbackId: string, adminId: string, reply: string) {
    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new NotFoundException(MSG.FEEDBACK_NOT_FOUND);
    }

    feedback.reply = reply;
    feedback.repliedBy = adminId;
    feedback.repliedAt = new Date();
    feedback.status = FeedbackStatus.REPLIED;

    await this.feedbackRepository.save(feedback);

    return { success: true };
  }

  async closeFeedback(feedbackId: string) {
    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new NotFoundException(MSG.FEEDBACK_NOT_FOUND);
    }

    feedback.status = FeedbackStatus.CLOSED;
    await this.feedbackRepository.save(feedback);

    return { success: true };
  }
}
