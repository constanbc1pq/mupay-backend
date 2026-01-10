import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  ICardProvider,
  CardProviderConfig,
  ProviderResponse,
  CardProductInfo,
  IssuingBalanceInfo,
} from './card-provider.interface';

export type ProviderRouteStrategy = 'product' | 'balance' | 'round_robin' | 'priority';

export interface ProviderStatus {
  providerCode: string;
  providerName: string;
  enabled: boolean;
  healthy: boolean;
  lastHealthCheck: Date | null;
  errorCount: number;
  lastError: string | null;
}

@Injectable()
export class CardProviderManagerService implements OnModuleInit {
  private readonly logger = new Logger(CardProviderManagerService.name);

  // 已注册的服务商适配器
  private providers: Map<string, ICardProvider> = new Map();

  // 服务商配置
  private providerConfigs: Map<string, CardProviderConfig> = new Map();

  // 服务商状态
  private providerStatus: Map<string, ProviderStatus> = new Map();

  // 产品到服务商的映射缓存
  private productProviderMap: Map<string, string> = new Map();

  // 健康检查间隔 (毫秒)
  private readonly healthCheckInterval = 60000; // 1 minute

  // 最大连续错误数，超过后标记为不健康
  private readonly maxConsecutiveErrors = 3;

  async onModuleInit() {
    // 启动健康检查定时任务
    this.startHealthCheckScheduler();
    this.logger.log('CardProviderManager initialized');
  }

  /**
   * 注册服务商适配器
   */
  async registerProvider(
    provider: ICardProvider,
    config: CardProviderConfig,
  ): Promise<void> {
    const { providerCode, providerName } = provider;

    if (this.providers.has(providerCode)) {
      this.logger.warn(`Provider ${providerCode} already registered, replacing...`);
    }

    try {
      // 初始化服务商
      await provider.initialize(config);

      // 注册服务商
      this.providers.set(providerCode, provider);
      this.providerConfigs.set(providerCode, config);
      this.providerStatus.set(providerCode, {
        providerCode,
        providerName,
        enabled: config.enabled,
        healthy: true,
        lastHealthCheck: null,
        errorCount: 0,
        lastError: null,
      });

      this.logger.log(`Provider ${providerCode} (${providerName}) registered successfully`);

      // 同步产品映射
      if (config.enabled) {
        await this.syncProviderProducts(providerCode);
      }
    } catch (error) {
      this.logger.error(`Failed to register provider ${providerCode}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 注销服务商
   */
  unregisterProvider(providerCode: string): void {
    this.providers.delete(providerCode);
    this.providerConfigs.delete(providerCode);
    this.providerStatus.delete(providerCode);

    // 清理产品映射
    for (const [productId, code] of this.productProviderMap.entries()) {
      if (code === providerCode) {
        this.productProviderMap.delete(productId);
      }
    }

    this.logger.log(`Provider ${providerCode} unregistered`);
  }

  /**
   * 获取服务商适配器
   */
  getProvider(providerCode: string): ICardProvider | undefined {
    return this.providers.get(providerCode);
  }

  /**
   * 获取所有已注册的服务商代码
   */
  getRegisteredProviderCodes(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * 获取所有可用（启用且健康）的服务商
   */
  getAvailableProviders(): ICardProvider[] {
    const available: ICardProvider[] = [];

    for (const [code, provider] of this.providers.entries()) {
      const status = this.providerStatus.get(code);
      if (status?.enabled && status?.healthy) {
        available.push(provider);
      }
    }

    return available;
  }

  /**
   * 获取所有服务商状态
   */
  getAllProviderStatus(): ProviderStatus[] {
    return Array.from(this.providerStatus.values());
  }

  /**
   * 获取指定服务商状态
   */
  getProviderStatus(providerCode: string): ProviderStatus | undefined {
    return this.providerStatus.get(providerCode);
  }

  /**
   * 启用/禁用服务商
   */
  setProviderEnabled(providerCode: string, enabled: boolean): void {
    const status = this.providerStatus.get(providerCode);
    if (status) {
      status.enabled = enabled;
      this.logger.log(`Provider ${providerCode} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * 根据产品ID获取服务商
   */
  getProviderByProduct(productId: string): ICardProvider | undefined {
    const providerCode = this.productProviderMap.get(productId);
    if (!providerCode) {
      return undefined;
    }

    const status = this.providerStatus.get(providerCode);
    if (!status?.enabled || !status?.healthy) {
      return undefined;
    }

    return this.providers.get(providerCode);
  }

  /**
   * 根据策略选择服务商
   */
  async selectProvider(
    strategy: ProviderRouteStrategy,
    context?: {
      productId?: string;
      currency?: string;
      amount?: number;
    },
  ): Promise<ICardProvider | undefined> {
    const availableProviders = this.getAvailableProviders();

    if (availableProviders.length === 0) {
      this.logger.warn('No available providers');
      return undefined;
    }

    switch (strategy) {
      case 'product':
        if (context?.productId) {
          return this.getProviderByProduct(context.productId);
        }
        return availableProviders[0];

      case 'balance':
        return await this.selectByBalance(availableProviders, context?.currency, context?.amount);

      case 'round_robin':
        return this.selectRoundRobin(availableProviders);

      case 'priority':
      default:
        // 按注册顺序返回第一个可用的
        return availableProviders[0];
    }
  }

  /**
   * 按余额选择服务商（选择余额充足且最多的）
   */
  private async selectByBalance(
    providers: ICardProvider[],
    currency?: string,
    requiredAmount?: number,
  ): Promise<ICardProvider | undefined> {
    let selectedProvider: ICardProvider | undefined;
    let maxBalance = -1;

    for (const provider of providers) {
      try {
        const response = await provider.retrieveIssuingBalance(currency);
        if (response.success && response.data) {
          const balances = response.data;
          const targetBalance = currency
            ? balances.find((b) => b.currency === currency)
            : balances[0];

          if (targetBalance) {
            const available = targetBalance.availableBalance;

            // 如果有最小金额要求，检查余额是否充足
            if (requiredAmount && available < requiredAmount) {
              continue;
            }

            if (available > maxBalance) {
              maxBalance = available;
              selectedProvider = provider;
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to get balance from ${provider.providerCode}: ${error.message}`);
      }
    }

    return selectedProvider;
  }

  // Round-robin 计数器
  private roundRobinIndex = 0;

  /**
   * 轮询选择服务商
   */
  private selectRoundRobin(providers: ICardProvider[]): ICardProvider {
    const index = this.roundRobinIndex % providers.length;
    this.roundRobinIndex++;
    return providers[index];
  }

  /**
   * 执行带故障转移的操作
   */
  async executeWithFailover<T>(
    operation: (provider: ICardProvider) => Promise<ProviderResponse<T>>,
    options?: {
      preferredProviderCode?: string;
      strategy?: ProviderRouteStrategy;
      context?: {
        productId?: string;
        currency?: string;
        amount?: number;
      };
    },
  ): Promise<ProviderResponse<T> & { providerCode?: string }> {
    // 构建服务商尝试顺序
    const providerOrder: ICardProvider[] = [];

    // 如果指定了首选服务商
    if (options?.preferredProviderCode) {
      const preferred = this.getProvider(options.preferredProviderCode);
      const status = this.providerStatus.get(options.preferredProviderCode);
      if (preferred && status?.enabled && status?.healthy) {
        providerOrder.push(preferred);
      }
    }

    // 根据策略选择服务商
    const strategyProvider = await this.selectProvider(
      options?.strategy || 'priority',
      options?.context,
    );
    if (strategyProvider && !providerOrder.includes(strategyProvider)) {
      providerOrder.push(strategyProvider);
    }

    // 添加其他可用服务商作为备选
    for (const provider of this.getAvailableProviders()) {
      if (!providerOrder.includes(provider)) {
        providerOrder.push(provider);
      }
    }

    if (providerOrder.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_AVAILABLE_PROVIDER',
          message: 'No available card provider',
        },
      };
    }

    // 依次尝试服务商
    let lastError: any;
    for (const provider of providerOrder) {
      try {
        const result = await operation(provider);

        if (result.success) {
          // 成功，重置错误计数
          this.resetProviderError(provider.providerCode);
          return {
            ...result,
            providerCode: provider.providerCode,
          };
        }

        // 操作失败但不是服务商故障，直接返回
        if (result.error?.code !== 'PROVIDER_ERROR') {
          return {
            ...result,
            providerCode: provider.providerCode,
          };
        }

        // 服务商故障，记录错误并尝试下一个
        this.recordProviderError(provider.providerCode, result.error.message);
        lastError = result.error;
      } catch (error) {
        this.recordProviderError(provider.providerCode, error.message);
        lastError = error;
        this.logger.warn(
          `Provider ${provider.providerCode} failed: ${error.message}, trying next...`,
        );
      }
    }

    // 所有服务商都失败了
    return {
      success: false,
      error: {
        code: 'ALL_PROVIDERS_FAILED',
        message: `All providers failed. Last error: ${lastError?.message || 'Unknown error'}`,
      },
    };
  }

  /**
   * 同步服务商产品映射
   */
  private async syncProviderProducts(providerCode: string): Promise<void> {
    const provider = this.providers.get(providerCode);
    if (!provider) return;

    try {
      const response = await provider.listCardProducts();
      if (response.success && response.data) {
        for (const product of response.data) {
          this.productProviderMap.set(product.providerProductId, providerCode);
        }
        this.logger.log(
          `Synced ${response.data.length} products from provider ${providerCode}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to sync products from provider ${providerCode}: ${error.message}`,
      );
    }
  }

  /**
   * 记录服务商错误
   */
  private recordProviderError(providerCode: string, errorMessage: string): void {
    const status = this.providerStatus.get(providerCode);
    if (!status) return;

    status.errorCount++;
    status.lastError = errorMessage;

    if (status.errorCount >= this.maxConsecutiveErrors) {
      status.healthy = false;
      this.logger.warn(
        `Provider ${providerCode} marked as unhealthy after ${status.errorCount} consecutive errors`,
      );
    }
  }

  /**
   * 重置服务商错误计数
   */
  private resetProviderError(providerCode: string): void {
    const status = this.providerStatus.get(providerCode);
    if (!status) return;

    status.errorCount = 0;
    status.lastError = null;
  }

  /**
   * 启动健康检查定时任务
   */
  private startHealthCheckScheduler(): void {
    setInterval(async () => {
      await this.performHealthChecks();
    }, this.healthCheckInterval);
  }

  /**
   * 执行所有服务商健康检查
   */
  async performHealthChecks(): Promise<void> {
    for (const [code, provider] of this.providers.entries()) {
      const status = this.providerStatus.get(code);
      if (!status?.enabled) continue;

      try {
        const healthy = await provider.healthCheck();
        status.healthy = healthy;
        status.lastHealthCheck = new Date();

        if (healthy) {
          // 健康检查通过，重置错误计数
          status.errorCount = 0;
          status.lastError = null;
        }
      } catch (error) {
        status.healthy = false;
        status.lastHealthCheck = new Date();
        status.lastError = error.message;
        this.logger.warn(`Health check failed for provider ${code}: ${error.message}`);
      }
    }
  }

  /**
   * 手动触发指定服务商健康检查
   */
  async checkProviderHealth(providerCode: string): Promise<boolean> {
    const provider = this.providers.get(providerCode);
    const status = this.providerStatus.get(providerCode);

    if (!provider || !status) {
      return false;
    }

    try {
      const healthy = await provider.healthCheck();
      status.healthy = healthy;
      status.lastHealthCheck = new Date();

      if (healthy) {
        status.errorCount = 0;
        status.lastError = null;
      }

      return healthy;
    } catch (error) {
      status.healthy = false;
      status.lastHealthCheck = new Date();
      status.lastError = error.message;
      return false;
    }
  }

  /**
   * 获取所有服务商的产品列表
   */
  async getAllProducts(): Promise<{
    providerCode: string;
    providerName: string;
    products: CardProductInfo[];
  }[]> {
    const results: {
      providerCode: string;
      providerName: string;
      products: CardProductInfo[];
    }[] = [];

    for (const [code, provider] of this.providers.entries()) {
      const status = this.providerStatus.get(code);
      if (!status?.enabled || !status?.healthy) continue;

      try {
        const response = await provider.listCardProducts();
        if (response.success && response.data) {
          results.push({
            providerCode: code,
            providerName: provider.providerName,
            products: response.data,
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to get products from ${code}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * 获取所有服务商的发行余额
   */
  async getAllBalances(): Promise<{
    providerCode: string;
    providerName: string;
    balances: IssuingBalanceInfo[];
  }[]> {
    const results: {
      providerCode: string;
      providerName: string;
      balances: IssuingBalanceInfo[];
    }[] = [];

    for (const [code, provider] of this.providers.entries()) {
      const status = this.providerStatus.get(code);
      if (!status?.enabled) continue;

      try {
        const response = await provider.retrieveIssuingBalance();
        if (response.success && response.data) {
          results.push({
            providerCode: code,
            providerName: provider.providerName,
            balances: response.data,
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to get balance from ${code}: ${error.message}`);
      }
    }

    return results;
  }
}
