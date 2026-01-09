import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@database/entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SetPaymentPasswordDto, VerifyPaymentPasswordDto, UpdatePaymentPasswordDto } from './dto/payment-password.dto';

@ApiTags('用户')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

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
}
