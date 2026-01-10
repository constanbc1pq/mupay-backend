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
import { CardService } from './card.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@database/entities/user.entity';
import { ApplyCardDto } from './dto/apply-card.dto';
import { ApplyCardV2Dto } from './dto/apply-card-v2.dto';
import { RechargeCardDto } from './dto/recharge-card.dto';
import { UpgradeCardDto } from './dto/upgrade-card.dto';
import { WithdrawCardDto } from './dto/withdraw-card.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { UpdateCardStatusDto } from './dto/update-card-status.dto';

@ApiTags('卡片')
@Controller('card')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CardController {
  constructor(private readonly cardService: CardService) {}

  // ============ 服务商和产品 ============

  @Get('providers')
  @ApiOperation({ summary: '获取可用服务商列表' })
  @ApiResponse({ status: 200, description: '返回服务商列表' })
  async getProviders() {
    return this.cardService.getProviders();
  }

  @Get('products')
  @ApiOperation({ summary: '获取可用卡产品列表' })
  @ApiQuery({ name: 'providerId', required: false, description: '服务商ID (可选)' })
  @ApiResponse({ status: 200, description: '返回产品列表' })
  async getProducts(@Query('providerId') providerId?: string) {
    return this.cardService.getProducts(providerId);
  }

  @Get('products/:id')
  @ApiOperation({ summary: '获取产品详情' })
  @ApiResponse({ status: 200, description: '返回产品详情' })
  async getProductDetail(@Param('id') productId: string) {
    return this.cardService.getProductDetail(productId);
  }

  // ============ 卡片列表和类型 (兼容旧版) ============

  @Get('list')
  @ApiOperation({ summary: '我的卡片列表' })
  async getCards(@CurrentUser() user: User) {
    return this.cardService.getCards(user.id);
  }

  @Get('types')
  @ApiOperation({ summary: '卡片类型及费用 (旧版)' })
  async getCardTypes() {
    return this.cardService.getCardTypes();
  }

  // ============ 申请卡片 ============

  @Post('apply')
  @ApiOperation({ summary: '申请新卡 (旧版)' })
  async applyCard(@CurrentUser() user: User, @Body() dto: ApplyCardDto) {
    return this.cardService.applyCard(user.id, dto);
  }

  @Post('apply/v2')
  @ApiOperation({ summary: '申请新卡 (V2 - 基于服务商/产品)' })
  @ApiResponse({ status: 201, description: '卡片申请成功' })
  @ApiResponse({ status: 400, description: '申请失败 (KYC等级不足/持卡人不存在等)' })
  async applyCardV2(@CurrentUser() user: User, @Body() dto: ApplyCardV2Dto) {
    return this.cardService.applyCardV2(user.id, dto);
  }

  // ============ 卡片详情 ============

  @Get(':id')
  @ApiOperation({ summary: '卡片详情' })
  async getCardDetail(@CurrentUser() user: User, @Param('id') id: string) {
    return this.cardService.getCardDetail(user.id, id);
  }

  @Get(':id/cvv')
  @ApiOperation({ summary: '获取CVV (需验证支付密码)' })
  async getCvv(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('paymentPassword') paymentPassword: string,
  ) {
    return this.cardService.getCvv(user.id, id, paymentPassword);
  }

  @Post(':id/sensitive')
  @ApiOperation({ summary: '获取卡片敏感信息 (卡号、CVV)' })
  @ApiResponse({ status: 200, description: '返回敏感信息 (30秒有效)' })
  async getSensitiveInfo(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('paymentPassword') paymentPassword: string,
  ) {
    return this.cardService.getCardSensitiveInfo(user.id, id, paymentPassword);
  }

  // ============ 充值和提现 ============

  @Post(':id/recharge')
  @ApiOperation({ summary: '充值到卡' })
  async rechargeCard(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RechargeCardDto,
  ) {
    return this.cardService.rechargeCard(user.id, id, dto);
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: '卡余额提现到钱包' })
  @ApiResponse({ status: 200, description: '提现成功' })
  @ApiResponse({ status: 400, description: '提现失败' })
  async withdrawCard(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: WithdrawCardDto,
  ) {
    return this.cardService.withdrawCard(user.id, id, dto);
  }

  // ============ 卡状态管理 ============

  @Post(':id/freeze')
  @ApiOperation({ summary: '冻结卡片' })
  async freezeCard(@CurrentUser() user: User, @Param('id') id: string) {
    return this.cardService.freezeCard(user.id, id);
  }

  @Post(':id/unfreeze')
  @ApiOperation({ summary: '解冻卡片' })
  async unfreezeCard(@CurrentUser() user: User, @Param('id') id: string) {
    return this.cardService.unfreezeCard(user.id, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '更新卡状态' })
  @ApiResponse({ status: 200, description: '状态更新成功' })
  async updateCardStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateCardStatusDto,
  ) {
    return this.cardService.updateCardStatus(user.id, id, dto);
  }

  // ============ 升级和同步 ============

  @Post(':id/upgrade')
  @ApiOperation({ summary: '升级卡片等级 (旧版)' })
  async upgradeCard(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpgradeCardDto,
  ) {
    return this.cardService.upgradeCard(user.id, id, dto);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: '同步卡片信息' })
  @ApiResponse({ status: 200, description: '同步成功' })
  async syncCard(@CurrentUser() user: User, @Param('id') id: string) {
    return this.cardService.syncCard(user.id, id);
  }

  // ============ 交易记录 ============

  @Get(':id/transactions')
  @ApiOperation({ summary: '获取卡交易记录' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量' })
  @ApiQuery({ name: 'type', required: false, description: '交易类型' })
  @ApiQuery({ name: 'status', required: false, description: '交易状态' })
  @ApiQuery({ name: 'startTime', required: false, description: '开始时间' })
  @ApiQuery({ name: 'endTime', required: false, description: '结束时间' })
  @ApiResponse({ status: 200, description: '返回交易记录列表' })
  async getTransactions(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query() dto: ListTransactionsDto,
  ) {
    return this.cardService.getCardTransactions(user.id, id, dto);
  }

  @Post(':id/transactions/sync')
  @ApiOperation({ summary: '同步卡交易记录' })
  @ApiResponse({ status: 200, description: '返回同步数量' })
  async syncTransactions(@CurrentUser() user: User, @Param('id') id: string) {
    const syncedCount = await this.cardService.syncCardTransactions(user.id, id);
    return { syncedCount };
  }
}
