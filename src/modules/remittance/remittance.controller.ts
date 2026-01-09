import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RemittanceService } from './remittance.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@database/entities/user.entity';
import { PaginationQueryDto } from '@common/dto/api-response.dto';
import { BankRemittanceDto } from './dto/bank-remittance.dto';
import { UsdtWithdrawDto } from './dto/usdt-withdraw.dto';
import { FeeCalcDto } from './dto/fee-calc.dto';

@ApiTags('汇款')
@Controller('remittance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RemittanceController {
  constructor(private readonly remittanceService: RemittanceService) {}

  @Get('countries')
  @ApiOperation({ summary: '支持的国家列表' })
  async getCountries() {
    return this.remittanceService.getCountries();
  }

  @Get('banks')
  @ApiOperation({ summary: '银行列表' })
  @ApiQuery({ name: 'countryCode', required: true })
  async getBanks(@Query('countryCode') countryCode: string) {
    return this.remittanceService.getBanks(countryCode);
  }

  @Get('rate')
  @ApiOperation({ summary: '获取汇率' })
  @ApiQuery({ name: 'currency', required: true })
  async getRate(@Query('currency') currency: string) {
    return this.remittanceService.getRate(currency);
  }

  @Get('fee-calc')
  @ApiOperation({ summary: '费用计算' })
  async calcFee(@Query() dto: FeeCalcDto) {
    return this.remittanceService.calcFee(dto);
  }

  @Post('bank')
  @ApiOperation({ summary: '发起银行汇款' })
  async createBankRemittance(
    @CurrentUser() user: User,
    @Body() dto: BankRemittanceDto,
  ) {
    return this.remittanceService.createBankRemittance(user.id, dto);
  }

  @Post('usdt')
  @ApiOperation({ summary: '发起USDT提取' })
  async createUsdtWithdraw(
    @CurrentUser() user: User,
    @Body() dto: UsdtWithdrawDto,
  ) {
    return this.remittanceService.createUsdtWithdraw(user.id, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: '汇款订单列表' })
  async getOrders(
    @CurrentUser() user: User,
    @Query() query: PaginationQueryDto,
  ) {
    return this.remittanceService.getOrders(user.id, query);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: '订单详情' })
  async getOrderDetail(@CurrentUser() user: User, @Param('id') id: string) {
    return this.remittanceService.getOrderDetail(user.id, id);
  }
}
