import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@database/entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SetPaymentPasswordDto, VerifyPaymentPasswordDto, UpdatePaymentPasswordDto } from './dto/payment-password.dto';
import { DepositNotificationService } from '@services/notification/deposit-notification.service';

@ApiTags('用户')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly notificationService: DepositNotificationService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: '获取个人信息' })
  async getProfile(@CurrentUser() user: User) {
    return this.userService.getProfile(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: '更新个人信息' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(user.id, updateDto);
  }

  @Post('payment-password')
  @ApiOperation({ summary: '设置支付密码' })
  async setPaymentPassword(
    @CurrentUser() user: User,
    @Body() dto: SetPaymentPasswordDto,
  ) {
    return this.userService.setPaymentPassword(user.id, dto);
  }

  @Post('payment-password/verify')
  @ApiOperation({ summary: '验证支付密码' })
  async verifyPaymentPassword(
    @CurrentUser() user: User,
    @Body() dto: VerifyPaymentPasswordDto,
  ) {
    return this.userService.verifyPaymentPassword(user.id, dto.password);
  }

  @Patch('payment-password')
  @ApiOperation({ summary: '修改支付密码' })
  async updatePaymentPassword(
    @CurrentUser() user: User,
    @Body() dto: UpdatePaymentPasswordDto,
  ) {
    return this.userService.updatePaymentPassword(user.id, dto);
  }

  // Notification endpoints

  @Get('notifications')
  @ApiOperation({ summary: '获取通知列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async getNotifications(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.notificationService.getUserNotifications(
      user.id,
      page || 1,
      limit || 20,
      unreadOnly || false,
    );
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: '获取未读通知数量' })
  async getUnreadCount(@CurrentUser() user: User) {
    const count = await this.notificationService.getUnreadCount(user.id);
    return { count };
  }

  @Post('notifications/:id/read')
  @ApiOperation({ summary: '标记通知为已读' })
  async markAsRead(
    @CurrentUser() user: User,
    @Param('id') notificationId: string,
  ) {
    const success = await this.notificationService.markAsRead(user.id, notificationId);
    return { success };
  }

  @Post('notifications/read-all')
  @ApiOperation({ summary: '标记所有通知为已读' })
  async markAllAsRead(@CurrentUser() user: User) {
    const count = await this.notificationService.markAllAsRead(user.id);
    return { count };
  }
}
