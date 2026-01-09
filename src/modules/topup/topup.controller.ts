import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TopupService } from './topup.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@database/entities/user.entity';
import { PaginationQueryDto } from '@common/dto/api-response.dto';
import { CreateTopupDto } from './dto/create-topup.dto';

@ApiTags('话费充值')
@Controller('topup')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TopupController {
  constructor(private readonly topupService: TopupService) {}

  @Get('operators')
  @ApiOperation({ summary: '运营商列表' })
  async getOperators() {
    return this.topupService.getOperators();
  }

  @Get('packages')
  @ApiOperation({ summary: '充值套餐' })
  async getPackages() {
    return this.topupService.getPackages();
  }

  @Post()
  @ApiOperation({ summary: '发起充值' })
  async createTopup(@CurrentUser() user: User, @Body() dto: CreateTopupDto) {
    return this.topupService.createTopup(user.id, dto);
  }

  @Get('records')
  @ApiOperation({ summary: '充值记录' })
  async getRecords(
    @CurrentUser() user: User,
    @Query() query: PaginationQueryDto,
  ) {
    return this.topupService.getRecords(user.id, query);
  }
}
