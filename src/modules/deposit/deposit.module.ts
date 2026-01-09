import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { DepositController, WebhookController } from './deposit.controller';
import { DepositService } from './deposit.service';
import { DepositLimitService } from './deposit-limit.service';
import { DepositOrder } from '@database/entities/deposit-order.entity';
import { DepositAddress } from '@database/entities/deposit-address.entity';
import { DepositLimit } from '@database/entities/deposit-limit.entity';
import { Transaction } from '@database/entities/transaction.entity';
import { Wallet } from '@database/entities/wallet.entity';
import { User } from '@database/entities/user.entity';
import { DepositJob } from '../../jobs/deposit.job';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([DepositOrder, DepositAddress, DepositLimit, Transaction, Wallet, User]),
  ],
  controllers: [DepositController, WebhookController],
  providers: [DepositService, DepositLimitService, DepositJob],
  exports: [DepositService, DepositLimitService],
})
export class DepositModule implements OnModuleInit {
  constructor(private readonly depositLimitService: DepositLimitService) {}

  async onModuleInit() {
    // Initialize default limits if none exist
    await this.depositLimitService.initializeDefaultLimits();
  }
}
