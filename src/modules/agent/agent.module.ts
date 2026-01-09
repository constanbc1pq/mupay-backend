import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { Agent } from '@database/entities/agent.entity';
import { Referral } from '@database/entities/referral.entity';
import { AgentEarning } from '@database/entities/agent-earning.entity';
import { User } from '@database/entities/user.entity';
import { UserModule } from '../user/user.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, Referral, AgentEarning, User]),
    UserModule,
    WalletModule,
  ],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
