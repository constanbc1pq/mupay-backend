import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@database/entities/user.entity';
import { NotificationService } from './notification.service';
import { NotificationCategory } from '@database/entities/user-notification.entity';

@ApiTags('通知')
@Controller('notification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('list')
  @ApiOperation({ summary: '获取通知列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, enum: ['welcome', 'transaction', 'system', 'marketing'] })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async getNotifications(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: NotificationCategory,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.notificationService.getNotifications(user.id, {
      page: page || 1,
      limit: limit || 20,
      category,
      unreadOnly: unreadOnly === true || unreadOnly === 'true' as any,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: '获取未读通知数量' })
  async getUnreadCount(@CurrentUser() user: User) {
    const count = await this.notificationService.getUnreadCount(user.id);
    return { count };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取通知详情' })
  async getNotification(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    const notification = await this.notificationService.getNotificationById(user.id, id);
    if (notification && !notification.isRead) {
      // Auto mark as read when viewing
      await this.notificationService.markAsRead(user.id, id);
      notification.isRead = true;
      notification.readAt = new Date();
    }
    return notification;
  }

  @Post(':id/read')
  @ApiOperation({ summary: '标记通知为已读' })
  async markAsRead(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    const success = await this.notificationService.markAsRead(user.id, id);
    return { success };
  }

  @Post('read-all')
  @ApiOperation({ summary: '标记全部通知为已读' })
  async markAllAsRead(@CurrentUser() user: User) {
    const count = await this.notificationService.markAllAsRead(user.id);
    return { count };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知' })
  async deleteNotification(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    const success = await this.notificationService.deleteNotification(user.id, id);
    return { success };
  }
}
