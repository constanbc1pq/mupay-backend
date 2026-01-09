import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransferService } from './transfer.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@database/entities/user.entity';
import { PaginationQueryDto } from '@common/dto/api-response.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { SearchUserDto } from './dto/search-user.dto';

@ApiTags('转账')
@Controller('transfer')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Get('contacts')
  @ApiOperation({ summary: '常用联系人' })
  async getContacts(@CurrentUser() user: User) {
    return this.transferService.getContacts(user.id);
  }

  @Post('search-user')
  @ApiOperation({ summary: '搜索用户' })
  async searchUser(@Body() dto: SearchUserDto) {
    return this.transferService.searchUser(dto.keyword);
  }

  @Post()
  @ApiOperation({ summary: '发起转账' })
  async createTransfer(
    @CurrentUser() user: User,
    @Body() dto: CreateTransferDto,
  ) {
    return this.transferService.createTransfer(user.id, dto);
  }

  @Get('records')
  @ApiOperation({ summary: '转账记录' })
  async getRecords(
    @CurrentUser() user: User,
    @Query() query: PaginationQueryDto,
  ) {
    return this.transferService.getRecords(user.id, query);
  }
}
