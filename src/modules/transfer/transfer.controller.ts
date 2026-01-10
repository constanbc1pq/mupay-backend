import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
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
import { AddContactDto, UpdateContactDto, ContactQueryDto } from './dto/contact.dto';

@ApiTags('转账')
@Controller('transfer')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Get('contacts')
  @ApiOperation({ summary: '联系人列表' })
  async getContacts(
    @CurrentUser() user: User,
    @Query() query: ContactQueryDto,
  ) {
    return this.transferService.getContacts(user.id, query.keyword);
  }

  @Post('contacts')
  @ApiOperation({ summary: '添加联系人' })
  async addContact(
    @CurrentUser() user: User,
    @Body() dto: AddContactDto,
  ) {
    return this.transferService.addContact(user.id, dto);
  }

  @Patch('contacts/:id')
  @ApiOperation({ summary: '更新联系人备注' })
  async updateContact(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.transferService.updateContact(user.id, id, dto.remark);
  }

  @Delete('contacts/:id')
  @ApiOperation({ summary: '删除联系人' })
  async deleteContact(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.transferService.deleteContact(user.id, id);
  }

  @Get('contacts/:id/records')
  @ApiOperation({ summary: '与联系人的转账记录' })
  async getContactRecords(
    @CurrentUser() user: User,
    @Param('id') contactId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.transferService.getContactRecords(user.id, contactId, query);
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
