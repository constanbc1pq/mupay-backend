import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';
import { Transfer } from '@database/entities/transfer.entity';
import { Contact } from '@database/entities/contact.entity';
import { User } from '@database/entities/user.entity';
import { UserModule } from '../user/user.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transfer, Contact, User]),
    UserModule,
    WalletModule,
  ],
  controllers: [TransferController],
  providers: [TransferService],
  exports: [TransferService],
})
export class TransferModule {}
