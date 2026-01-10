import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray, MaxLength } from 'class-validator';
import { FeedbackType } from '@database/entities/feedback.entity';

export class SubmitFeedbackDto {
  @ApiProperty({ description: '反馈类型', enum: FeedbackType })
  @IsEnum(FeedbackType)
  type: FeedbackType;

  @ApiProperty({ description: '反馈内容' })
  @IsString()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ description: '图片URL列表 (最多3张)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class AdminReplyFeedbackDto {
  @ApiProperty({ description: '回复内容' })
  @IsString()
  @MaxLength(2000)
  reply: string;
}

export class FaqCategoryDto {
  @ApiProperty({ description: 'ID' })
  id: string;

  @ApiProperty({ description: '分类名称' })
  name: string;

  @ApiPropertyOptional({ description: '翻译键' })
  nameKey?: string;

  @ApiPropertyOptional({ description: '图标' })
  icon?: string;

  @ApiProperty({ description: '问题数量' })
  itemCount: number;
}

export class FaqItemDto {
  @ApiProperty({ description: 'ID' })
  id: string;

  @ApiProperty({ description: '问题' })
  question: string;

  @ApiPropertyOptional({ description: '问题翻译键' })
  questionKey?: string;

  @ApiProperty({ description: '答案' })
  answer: string;

  @ApiPropertyOptional({ description: '答案翻译键' })
  answerKey?: string;

  @ApiProperty({ description: '浏览次数' })
  viewCount: number;
}
