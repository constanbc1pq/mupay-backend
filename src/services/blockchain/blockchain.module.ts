import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HdWalletService } from './hd-wallet.service';
import { BlockchainMonitorService } from './monitor.service';
import { SweepService } from './sweep.service';
import { DepositAddress } from '@database/entities/deposit-address.entity';
import { DepositOrder } from '@database/entities/deposit-order.entity';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([DepositAddress, DepositOrder]),
  ],
  providers: [HdWalletService, BlockchainMonitorService, SweepService],
  exports: [HdWalletService, BlockchainMonitorService, SweepService],
})
export class BlockchainModule {}
