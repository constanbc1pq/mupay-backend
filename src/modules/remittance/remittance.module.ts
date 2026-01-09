import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RemittanceController } from './remittance.controller';
import { RemittanceService } from './remittance.service';
import { Remittance } from '@database/entities/remittance.entity';
import { UsdtWithdraw } from '@database/entities/usdt-withdraw.entity';
import { Country } from '@database/entities/country.entity';
import { Bank } from '@database/entities/bank.entity';
import { ExchangeRate } from '@database/entities/exchange-rate.entity';
import { UserModule } from '../user/user.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Remittance, UsdtWithdraw, Country, Bank, ExchangeRate]),
    UserModule,
    WalletModule,
  ],
  controllers: [RemittanceController],
  providers: [RemittanceService],
  exports: [RemittanceService],
})
export class RemittanceModule {}
