import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import configuration from './config/configuration';
import { getDatabaseConfig } from './config/database.config';
import { RedisModule } from './config/redis.module';
import { RedisService } from './config/redis.service';
import { EmailModule } from './config/email.module';
import { BlockchainModule } from './services/blockchain/blockchain.module';
import { PaymentModule } from './services/payment/payment.module';
import { CardProviderModule } from './services/card-provider/card-provider.module';
import { NotificationModule as DepositNotificationModule } from './services/notification/notification.module';
import { NotificationModule } from './modules/notification/notification.module';
import { StorageModule } from './services/storage/storage.module';

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
import { UploadModule } from './modules/upload/upload.module';
import { KycModule } from './modules/kyc/kyc.module';
import { SecurityModule } from './modules/security/security.module';
import { SupportModule } from './modules/support/support.module';
import { AccountModule } from './modules/account/account.module';
import { CardholderModule } from './modules/cardholder/cardholder.module';

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

    // Card Provider (Multi-provider adapter)
    CardProviderModule,

    // Deposit Notification & Audit (legacy)
    DepositNotificationModule,

    // Notification Module (new)
    NotificationModule,

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Static file serving for uploads
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
      },
    }),

    // Storage
    StorageModule,

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
    UploadModule,
    KycModule,
    SecurityModule,
    SupportModule,
    AccountModule,
    CardholderModule,
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
