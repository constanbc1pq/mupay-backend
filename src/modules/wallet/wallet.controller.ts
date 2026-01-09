import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@database/entities/user.entity';
import { PaginationQueryDto } from '@common/dto/api-response.dto';

@ApiTags('钱包')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: '获取余额' })
  async getBalance(@CurrentUser() user: User) {
    return this.walletService.getBalance(user.id);
  }

  @Get('deposit-address')
  @ApiOperation({ summary: '获取充值地址' })
  @ApiQuery({ name: 'network', enum: ['TRC20', 'ERC20', 'BEP20'], required: false })
  async getDepositAddress(
    @CurrentUser() user: User,
    @Query('network') network?: string,
  ) {
    return this.walletService.getDepositAddress(user.id, network);
  }

  @Get('transactions')
  @ApiOperation({ summary: '交易记录列表' })
  async getTransactions(
    @CurrentUser() user: User,
    @Query() query: PaginationQueryDto,
  ) {
    return this.walletService.getTransactions(user.id, query);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: '交易详情' })
  async getTransactionDetail(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.walletService.getTransactionDetail(user.id, id);
  }
}
