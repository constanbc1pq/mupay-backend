import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CardService } from './card.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@database/entities/user.entity';
import { ApplyCardDto } from './dto/apply-card.dto';
import { RechargeCardDto } from './dto/recharge-card.dto';
import { UpgradeCardDto } from './dto/upgrade-card.dto';

@ApiTags('卡片')
@Controller('card')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Get('list')
  @ApiOperation({ summary: '我的卡片列表' })
  async getCards(@CurrentUser() user: User) {
    return this.cardService.getCards(user.id);
  }

  @Get('types')
  @ApiOperation({ summary: '卡片类型及费用' })
  async getCardTypes() {
    return this.cardService.getCardTypes();
  }

  @Post('apply')
  @ApiOperation({ summary: '申请新卡' })
  async applyCard(@CurrentUser() user: User, @Body() dto: ApplyCardDto) {
    return this.cardService.applyCard(user.id, dto);
  }

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

  @Post(':id/recharge')
  @ApiOperation({ summary: '充值到卡' })
  async rechargeCard(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RechargeCardDto,
  ) {
    return this.cardService.rechargeCard(user.id, id, dto);
  }

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

  @Post(':id/upgrade')
  @ApiOperation({ summary: '升级卡片等级' })
  async upgradeCard(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpgradeCardDto,
  ) {
    return this.cardService.upgradeCard(user.id, id, dto);
  }
}
