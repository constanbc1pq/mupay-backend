import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@database/entities/user.entity';
import { SupportService } from './support.service';
import { SubmitFeedbackDto } from './dto/support.dto';

@ApiTags('帮助与反馈')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ==================== FAQ (Public) ====================

  @Get('faq/categories')
  @ApiOperation({ summary: 'FAQ分类列表' })
  async getCategories() {
    return this.supportService.getCategories();
  }

  @Get('faq')
  @ApiOperation({ summary: 'FAQ列表' })
  @ApiQuery({ name: 'categoryId', required: false })
  async getFaqList(@Query('categoryId') categoryId?: string) {
    return this.supportService.getFaqList(categoryId);
  }

  @Get('faq/:id')
  @ApiOperation({ summary: 'FAQ详情' })
  async getFaqDetail(@Param('id') id: string) {
    return this.supportService.getFaqDetail(id);
  }

  // ==================== Feedback (Authenticated) ====================

  @Post('feedback')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '提交反馈' })
  async submitFeedback(
    @CurrentUser() user: User,
    @Body() dto: SubmitFeedbackDto,
  ) {
    return this.supportService.submitFeedback(user.id, dto);
  }

  @Get('feedback')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '我的反馈列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserFeedback(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.supportService.getUserFeedback(user.id, page || 1, limit || 20);
  }

  @Get('feedback/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '反馈详情' })
  async getFeedbackDetail(
    @CurrentUser() user: User,
    @Param('id') feedbackId: string,
  ) {
    return this.supportService.getFeedbackDetail(user.id, feedbackId);
  }
}
