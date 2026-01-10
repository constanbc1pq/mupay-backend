import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardholderController } from './cardholder.controller';
import { CardholderService } from './cardholder.service';
import { Cardholder } from '../../database/entities/cardholder.entity';
import { CardProvider } from '../../database/entities/card-provider.entity';
import { User } from '../../database/entities/user.entity';
import { KycRecord } from '../../database/entities/kyc-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cardholder, CardProvider, User, KycRecord]),
  ],
  controllers: [CardholderController],
  providers: [CardholderService],
  exports: [CardholderService],
})
export class CardholderModule {}
