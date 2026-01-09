import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TopupController } from './topup.controller';
import { TopupService } from './topup.service';
import { Topup } from '@database/entities/topup.entity';
import { MobileOperator } from '@database/entities/mobile-operator.entity';
import { UserModule } from '../user/user.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Topup, MobileOperator]),
    UserModule,
    WalletModule,
  ],
  controllers: [TopupController],
  providers: [TopupService],
  exports: [TopupService],
})
export class TopupModule {}
