import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardController } from './card.controller';
import { CardWebhookController } from './card-webhook.controller';
import { CardService } from './card.service';
import { CardWebhookService } from './card-webhook.service';
import { Card } from '@database/entities/card.entity';
import { CardRecharge } from '@database/entities/card-recharge.entity';
import { CardProvider } from '@database/entities/card-provider.entity';
import { CardProduct } from '@database/entities/card-product.entity';
import { Cardholder } from '@database/entities/cardholder.entity';
import { CardTransaction } from '@database/entities/card-transaction.entity';
import { UserModule } from '../user/user.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Card,
      CardRecharge,
      CardProvider,
      CardProduct,
      Cardholder,
      CardTransaction,
    ]),
    UserModule,
    WalletModule,
  ],
  controllers: [CardController, CardWebhookController],
  providers: [CardService, CardWebhookService],
  exports: [CardService],
})
export class CardModule {}
