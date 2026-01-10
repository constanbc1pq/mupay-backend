import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { CardholderService, CardholderCheckResult } from './cardholder.service';
import { CreateCardholderDto, UpdateCardholderDto } from './dto';
import { Cardholder } from '../../database/entities/cardholder.entity';

@ApiTags('持卡人')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cardholder')
export class CardholderController {
  constructor(private readonly cardholderService: CardholderService) {}

  @Get('check')
  @ApiOperation({ summary: '检查是否可创建持卡人' })
  @ApiResponse({
    status: 200,
    description: '返回检查结果',
    schema: {
      type: 'object',
      properties: {
        canCreate: { type: 'boolean' },
        reason: { type: 'string' },
        kycLevel: { type: 'number' },
        requiredKycLevel: { type: 'number' },
        existingCardholders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              providerId: { type: 'string' },
              providerName: { type: 'string' },
              status: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async checkCanCreate(@CurrentUser() user: User): Promise<CardholderCheckResult> {
    return this.cardholderService.checkCanCreateCardholder(user.id);
  }

  @Get()
  @ApiOperation({ summary: '获取当前用户持卡人信息' })
  @ApiQuery({ name: 'providerId', required: false, description: '服务商ID (不传则返回第一个)' })
  @ApiResponse({ status: 200, description: '返回持卡人信息' })
  async getCardholder(
    @CurrentUser() user: User,
    @Query('providerId') providerId?: string,
  ): Promise<Cardholder | null> {
    return this.cardholderService.getCardholder(user.id, providerId);
  }

  @Get('list')
  @ApiOperation({ summary: '获取用户所有持卡人列表' })
  @ApiResponse({ status: 200, description: '返回持卡人列表' })
  async getAllCardholders(@CurrentUser() user: User): Promise<Cardholder[]> {
    return this.cardholderService.getAllCardholders(user.id);
  }

  @Post()
  @ApiOperation({ summary: '创建持卡人' })
  @ApiResponse({ status: 201, description: '持卡人创建成功' })
  @ApiResponse({ status: 400, description: '创建失败 (KYC等级不足/已存在等)' })
  async createCardholder(
    @CurrentUser() user: User,
    @Body() dto: CreateCardholderDto,
  ): Promise<Cardholder> {
    return this.cardholderService.createCardholder(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新持卡人信息' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '持卡人不存在' })
  async updateCardholder(
    @CurrentUser() user: User,
    @Param('id') cardholderId: string,
    @Body() dto: UpdateCardholderDto,
  ): Promise<Cardholder> {
    return this.cardholderService.updateCardholder(user.id, cardholderId, dto);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: '同步持卡人信息' })
  @ApiResponse({ status: 200, description: '同步成功' })
  @ApiResponse({ status: 404, description: '持卡人不存在' })
  async syncCardholder(
    @CurrentUser() user: User,
    @Param('id') cardholderId: string,
  ): Promise<Cardholder> {
    // TODO: 验证持卡人属于当前用户
    return this.cardholderService.syncCardholder(cardholderId);
  }
}
