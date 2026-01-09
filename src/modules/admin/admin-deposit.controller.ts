import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '@common/guards/admin-auth.guard';
import { CurrentAdmin } from '@common/decorators/current-admin.decorator';
import { AdminDepositService } from './admin-deposit.service';
import { AdminDepositQueryDto, ManualConfirmDto, AdminAuditLogQueryDto } from './dto/admin-deposit.dto';

@ApiTags('Admin充值管理')
@Controller('admin/deposits')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminDepositController {
  constructor(private readonly adminDepositService: AdminDepositService) {}

  @Get()
  @ApiOperation({ summary: '充值订单列表' })
  async getDepositOrders(@Query() query: AdminDepositQueryDto) {
    return this.adminDepositService.getDepositOrders(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '充值统计' })
  async getDepositStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminDepositService.getDepositStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('hot-wallet/balance')
  @ApiOperation({ summary: '热钱包余额' })
  async getHotWalletBalance() {
    return this.adminDepositService.getHotWalletBalance();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: '审计日志列表' })
  async getAuditLogs(@Query() query: AdminAuditLogQueryDto) {
    return this.adminDepositService.getAuditLogs(query);
  }

  @Get('addresses')
  @ApiOperation({ summary: '充值地址列表' })
  async getDepositAddresses(
    @Query('userId') userId?: string,
    @Query('network') network?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.adminDepositService.getDepositAddresses({ userId, network, page, pageSize });
  }

  @Get(':id')
  @ApiOperation({ summary: '充值订单详情' })
  async getDepositOrderDetail(@Param('id') id: string) {
    return this.adminDepositService.getDepositOrderDetail(id);
  }

  @Post(':id/manual-confirm')
  @ApiOperation({ summary: '人工确认充值' })
  async manualConfirm(
    @Param('id') id: string,
    @Body() dto: ManualConfirmDto,
    @CurrentAdmin() admin: { id: string },
    @Req() req: Request & { ip?: string },
  ) {
    return this.adminDepositService.manualConfirm(
      id,
      admin.id,
      req.ip,
      dto.remark,
    );
  }
}
