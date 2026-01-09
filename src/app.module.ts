import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { getDatabaseConfig } from './config/database.config';
import { RedisModule } from './config/redis.module';
import { RedisService } from './config/redis.service';
import { EmailModule } from './config/email.module';
import { BlockchainModule } from './services/blockchain/blockchain.module';
import { PaymentModule } from './services/payment/payment.module';
import { NotificationModule } from './services/notification/notification.module';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { UserModule } from './modules/user/user.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { CardModule } from './modules/card/card.module';
import { RemittanceModule } from './modules/remittance/remittance.module';
import { TransferModule } from './modules/transfer/transfer.module';
import { TopupModule } from './modules/topup/topup.module';
import { AgentModule } from './modules/agent/agent.module';
import { DepositModule } from './modules/deposit/deposit.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),

    // Redis
    RedisModule,

    // Email
    EmailModule,

    // Blockchain (HD Wallet)
    BlockchainModule,

    // Payment (Stripe, PayPal)
    PaymentModule,

    // Notification & Audit
    NotificationModule,

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Business modules
    AuthModule,
    AdminModule,
    UserModule,
    WalletModule,
    CardModule,
    RemittanceModule,
    TransferModule,
    TopupModule,
    AgentModule,
    DepositModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    // Clear Redis in development mode
    if (this.configService.get('nodeEnv') === 'development') {
      await this.redisService.flushDb();
      console.log('Redis cache cleared (development mode)');
    }
  }
}
