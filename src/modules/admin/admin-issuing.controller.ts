import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AdminAuthGuard } from '@common/guards/admin-auth.guard';
import { AdminIssuingService } from './admin-issuing.service';
import {
  AdminProviderQueryDto,
  UpdateProviderDto,
  AdminBalanceQueryDto,
  AdminBalanceTransactionQueryDto,
  UpdateBalanceAlertDto,
} from './dto/admin-issuing.dto';

@Controller('admin/issuing')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
@ApiTags('管理后台 - 发行管理')
export class AdminIssuingController {
  constructor(private readonly issuingService: AdminIssuingService) {}

  // ============ 服务商管理 ============

  @Get('providers')
  @ApiOperation({ summary: '服务商列表' })
  async getProviders(@Query() query: AdminProviderQueryDto) {
    return this.issuingService.getProviders(query);
  }

  @Get('providers/:id')
  @ApiOperation({ summary: '服务商详情' })
  @ApiParam({ name: 'id', description: '服务商ID' })
  async getProviderDetail(@Param('id') id: string) {
    return this.issuingService.getProviderDetail(id);
  }

  @Patch('providers/:id')
  @ApiOperation({ summary: '更新服务商配置' })
  @ApiParam({ name: 'id', description: '服务商ID' })
  async updateProvider(
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
  ) {
    return this.issuingService.updateProvider(id, dto);
  }

  @Post('providers/:id/health-check')
  @ApiOperation({ summary: '执行服务商健康检查' })
  @ApiParam({ name: 'id', description: '服务商ID' })
  async checkProviderHealth(@Param('id') id: string) {
    return this.issuingService.checkProviderHealth(id);
  }

  // ============ 发行余额管理 ============

  @Get('balances')
  @ApiOperation({ summary: '发行余额汇总列表' })
  async getBalanceSummary(@Query() query: AdminBalanceQueryDto) {
    return this.issuingService.getBalanceSummary(query);
  }

  @Get('balances/stats')
  @ApiOperation({ summary: '发行余额统计' })
  async getBalanceStats() {
    return this.issuingService.getBalanceStats();
  }

  @Get('balances/:providerId')
  @ApiOperation({ summary: '指定服务商余额详情' })
  @ApiParam({ name: 'providerId', description: '服务商ID' })
  async getProviderBalances(@Param('providerId') providerId: string) {
    return this.issuingService.getProviderBalances(providerId);
  }

  @Get('balances/:providerId/transactions')
  @ApiOperation({ summary: '余额交易记录' })
  @ApiParam({ name: 'providerId', description: '服务商ID' })
  async getBalanceTransactions(
    @Param('providerId') providerId: string,
    @Query() query: AdminBalanceTransactionQueryDto,
  ) {
    return this.issuingService.getBalanceTransactions(providerId, query);
  }

  @Patch('balances/alert/:balanceId')
  @ApiOperation({ summary: '更新余额预警配置' })
  @ApiParam({ name: 'balanceId', description: '余额ID' })
  async updateBalanceAlert(
    @Param('balanceId') balanceId: string,
    @Body() dto: UpdateBalanceAlertDto,
  ) {
    return this.issuingService.updateBalanceAlert(balanceId, dto);
  }

  // ============ 同步操作 ============

  @Post('sync/:providerId')
  @ApiOperation({ summary: '手动触发服务商数据同步' })
  @ApiParam({ name: 'providerId', description: '服务商ID' })
  async triggerSync(@Param('providerId') providerId: string) {
    return this.issuingService.triggerSync(providerId);
  }
}
