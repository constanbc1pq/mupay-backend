import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@database/entities/user.entity';
import { AccountService } from './account.service';
import { RequestDeletionDto } from './dto/account.dto';

@ApiTags('账户管理')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('delete-account/check')
  @ApiOperation({ summary: '检查注销条件' })
  async checkDeletionConditions(@CurrentUser() user: User) {
    return this.accountService.checkDeletionConditions(user.id);
  }

  @Post('delete-account/request')
  @ApiOperation({ summary: '申请注销账户' })
  async requestDeletion(
    @CurrentUser() user: User,
    @Body() dto: RequestDeletionDto,
  ) {
    return this.accountService.requestDeletion(user.id, dto);
  }

  @Post('delete-account/cancel')
  @ApiOperation({ summary: '撤销注销申请' })
  async cancelDeletion(@CurrentUser() user: User) {
    return this.accountService.cancelDeletion(user.id);
  }

  @Get('delete-account/status')
  @ApiOperation({ summary: '获取注销状态' })
  async getDeletionStatus(@CurrentUser() user: User) {
    return this.accountService.getDeletionStatus(user.id);
  }
}
