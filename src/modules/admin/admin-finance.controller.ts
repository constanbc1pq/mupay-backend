import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '@common/guards/admin-auth.guard';
import { AdminFinanceService, GetWithdrawsParams, GetTransfersParams } from './admin-finance.service';
import { PaginationQueryDto } from '@common/dto/api-response.dto';

class WithdrawQueryDto extends PaginationQueryDto {
  search?: string;
  status?: string;
  network?: string;
}

class TransferQueryDto extends PaginationQueryDto {
  search?: string;
  status?: string;
}

class UpdateWithdrawStatusDto {
  status: string;
  txHash?: string;
}

@ApiTags('Admin 财务管理')
@Controller('admin')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminFinanceController {
  constructor(private readonly financeService: AdminFinanceService) {}

  // ==================== Withdraws ====================

  @Get('withdraws')
  @ApiOperation({ summary: '提现列表' })
  async getWithdraws(@Query() query: WithdrawQueryDto) {
    return this.financeService.getWithdraws(query as GetWithdrawsParams);
  }

  @Get('withdraws/:id')
  @ApiOperation({ summary: '提现详情' })
  async getWithdrawDetail(@Param('id') id: string) {
    return this.financeService.getWithdrawDetail(id);
  }

  @Patch('withdraws/:id/status')
  @ApiOperation({ summary: '更新提现状态' })
  async updateWithdrawStatus(
    @Param('id') id: string,
    @Body() dto: UpdateWithdrawStatusDto,
  ) {
    return this.financeService.updateWithdrawStatus(id, dto.status, dto.txHash);
  }

  // ==================== Transfers ====================

  @Get('transfers')
  @ApiOperation({ summary: '转账列表' })
  async getTransfers(@Query() query: TransferQueryDto) {
    return this.financeService.getTransfers(query as GetTransfersParams);
  }

  @Get('transfers/:id')
  @ApiOperation({ summary: '转账详情' })
  async getTransferDetail(@Param('id') id: string) {
    return this.financeService.getTransferDetail(id);
  }
}
