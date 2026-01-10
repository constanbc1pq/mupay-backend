import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@database/entities/user.entity';
import { SecurityService } from './security.service';
import { Enable2FADto, Disable2FADto, Verify2FADto } from './dto/security.dto';

@ApiTags('安全中心')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  // ==================== 2FA ====================

  @Get('2fa/status')
  @ApiOperation({ summary: '获取2FA状态' })
  async get2FAStatus(@CurrentUser() user: User) {
    return this.securityService.get2FAStatus(user.id);
  }

  @Post('2fa/generate')
  @ApiOperation({ summary: '生成2FA密钥和二维码' })
  async generate2FASecret(@CurrentUser() user: User) {
    return this.securityService.generate2FASecret(user.id);
  }

  @Post('2fa/enable')
  @ApiOperation({ summary: '启用2FA' })
  async enable2FA(
    @CurrentUser() user: User,
    @Body() dto: Enable2FADto,
  ) {
    return this.securityService.enable2FA(user.id, dto.code);
  }

  @Post('2fa/disable')
  @ApiOperation({ summary: '禁用2FA' })
  async disable2FA(
    @CurrentUser() user: User,
    @Body() dto: Disable2FADto,
  ) {
    return this.securityService.disable2FA(user.id, dto.code);
  }

  @Post('2fa/verify')
  @ApiOperation({ summary: '验证2FA码' })
  async verify2FA(
    @CurrentUser() user: User,
    @Body() dto: Verify2FADto,
  ) {
    const result = await this.securityService.verify2FA(user.id, dto.code);
    return { success: result };
  }

  // ==================== Devices ====================

  @Get('devices')
  @ApiOperation({ summary: '获取设备列表' })
  async getDevices(@CurrentUser() user: User) {
    return this.securityService.getDevices(user.id);
  }

  @Delete('devices/:id')
  @ApiOperation({ summary: '移除设备' })
  async removeDevice(
    @CurrentUser() user: User,
    @Param('id') deviceId: string,
  ) {
    return this.securityService.removeDevice(user.id, deviceId);
  }

  // ==================== Login History ====================

  @Get('login-history')
  @ApiOperation({ summary: '登录历史' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLoginHistory(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.securityService.getLoginHistory(user.id, page || 1, limit || 20);
  }
}
