import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '@common/guards/admin-auth.guard';
import { CurrentAdmin } from '@common/decorators/current-admin.decorator';
import { KycService } from '../kyc/kyc.service';

class RejectKycDto {
  rejectReason: string;
}

@ApiTags('Admin KYC管理')
@Controller('admin/kyc')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminKycController {
  constructor(private readonly kycService: KycService) {}

  @Get('pending')
  @ApiOperation({ summary: '待审核KYC列表' })
  async getPendingList(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.kycService.getPendingList(page || 1, limit || 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'KYC认证详情' })
  async getRecordDetail(@Param('id') id: string) {
    return this.kycService.getRecordDetail(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: '通过KYC认证' })
  async approve(
    @Param('id') id: string,
    @CurrentAdmin() admin: { id: string },
  ) {
    return this.kycService.approve(id, admin.id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: '拒绝KYC认证' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectKycDto,
    @CurrentAdmin() admin: { id: string },
  ) {
    return this.kycService.reject(id, admin.id, dto.rejectReason);
  }
}
