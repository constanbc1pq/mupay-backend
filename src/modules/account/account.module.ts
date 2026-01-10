import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@database/entities/user.entity';
import { Wallet } from '@database/entities/wallet.entity';
import { Card } from '@database/entities/card.entity';
import { AccountDeletion } from '@database/entities/account-deletion.entity';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Wallet, Card, AccountDeletion])],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
