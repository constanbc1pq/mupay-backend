import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '@common/guards/admin-auth.guard';
import { AdminCardholderService, GetCardholdersParams } from './admin-cardholder.service';
import { PaginationQueryDto } from '@common/dto/api-response.dto';

class CardholderQueryDto extends PaginationQueryDto {
  search?: string;
  status?: string;
  userId?: string;
}

@ApiTags('Admin 持卡人管理')
@Controller('admin/cardholders')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminCardholderController {
  constructor(private readonly cardholderService: AdminCardholderService) {}

  @Get()
  @ApiOperation({ summary: '持卡人列表' })
  async getCardholders(@Query() query: CardholderQueryDto) {
    return this.cardholderService.getCardholders(query as GetCardholdersParams);
  }

  @Get(':id')
  @ApiOperation({ summary: '持卡人详情' })
  async getCardholderDetail(@Param('id') id: string) {
    return this.cardholderService.getCardholderDetail(id);
  }
}
