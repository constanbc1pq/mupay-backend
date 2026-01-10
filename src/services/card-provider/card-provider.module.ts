import { Module, Global, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CardProviderManagerService } from './card-provider-manager.service';
import { CardSyncService } from './card-sync.service';
import { UqpayAdapter } from './providers/uqpay';
import { Card } from '@database/entities/card.entity';
import { CardProvider } from '@database/entities/card-provider.entity';
import { CardTransaction } from '@database/entities/card-transaction.entity';
import { IssuingBalance } from '@database/entities/issuing-balance.entity';
import { IssuingBalanceTransaction } from '@database/entities/issuing-balance-transaction.entity';
import { CardSyncJob } from '../../jobs/card-sync.job';

/**
 * U卡服务商模块
 * 提供多服务商适配器管理、路由选择、故障转移等功能
 *
 * 使用方式:
 * 1. 在其他模块注入 CardProviderManagerService
 * 2. 使用 executeWithFailover() 执行带故障转移的操作
 * 3. 或直接通过 getProvider() 获取特定服务商适配器
 */
@Global()
@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Card,
      CardProvider,
      CardTransaction,
      IssuingBalance,
      IssuingBalanceTransaction,
    ]),
  ],
  providers: [
    CardProviderManagerService,
    CardSyncService,
    CardSyncJob,
  ],
  exports: [
    CardProviderManagerService,
    CardSyncService,
  ],
})
export class CardProviderModule implements OnModuleInit {
  private readonly logger = new Logger(CardProviderModule.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly providerManager: CardProviderManagerService,
  ) {}

  async onModuleInit() {
    await this.registerProviders();
  }

  /**
   * 注册所有配置的服务商
   */
  private async registerProviders() {
    // 注册 UQPAY
    const uqpayConfig = this.configService.get('cardProviders.uqpay');
    if (uqpayConfig?.enabled && uqpayConfig?.apiKey) {
      try {
        const uqpayAdapter = new UqpayAdapter();
        await this.providerManager.registerProvider(uqpayAdapter, {
          providerCode: 'uqpay',
          providerName: 'UQPAY',
          apiBaseUrl: uqpayConfig.apiBaseUrl,
          apiKey: uqpayConfig.apiKey,
          apiSecret: uqpayConfig.apiSecret,
          webhookSecret: uqpayConfig.webhookSecret,
          timeout: uqpayConfig.timeout,
          enabled: true,
        });
        this.logger.log('UQPAY provider registered successfully');
      } catch (error) {
        this.logger.error(`Failed to register UQPAY provider: ${error.message}`);
      }
    } else {
      this.logger.log('UQPAY provider is disabled or not configured');
    }

    // 在此处添加其他服务商的注册逻辑
    // if (otherProviderConfig?.enabled) { ... }
  }
}
