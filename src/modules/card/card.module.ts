import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardController } from './card.controller';
import { CardService } from './card.service';
import { Card } from '@database/entities/card.entity';
import { CardRecharge } from '@database/entities/card-recharge.entity';
import { UserModule } from '../user/user.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Card, CardRecharge]),
    UserModule,
    WalletModule,
  ],
  controllers: [CardController],
  providers: [CardService],
  exports: [CardService],
})
export class CardModule {}
