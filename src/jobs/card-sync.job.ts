import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CardSyncService } from '@services/card-provider/card-sync.service';

/**
 * 卡片数据同步定时任务
 */
@Injectable()
export class CardSyncJob {
  private readonly logger = new Logger(CardSyncJob.name);

  // 防止任务重叠的标志
  private isSyncingCards = false;
  private isSyncingTransactions = false;
  private isSyncingBalances = false;

  constructor(private readonly cardSyncService: CardSyncService) {}

  /**
   * 同步卡片状态 - 每小时执行
   * 更新卡片余额、状态、限额使用情况
   */
  @Cron(CronExpression.EVERY_HOUR)
  async syncCardStatus() {
    if (this.isSyncingCards) {
      this.logger.debug('Previous card sync still running, skipping...');
      return;
    }

    this.isSyncingCards = true;
    try {
      this.logger.log('Starting card status sync...');
      const count = await this.cardSyncService.syncAllCardStatus();
      if (count > 0) {
        this.logger.log(`Card status sync completed: ${count} cards updated`);
      } else {
        this.logger.debug('Card status sync completed: no changes');
      }
    } catch (error) {
      this.logger.error(`Card status sync failed: ${error.message}`, error.stack);
    } finally {
      this.isSyncingCards = false;
    }
  }

  /**
   * 同步卡交易记录 - 每5分钟执行
   * 拉取新的交易记录
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncTransactions() {
    if (this.isSyncingTransactions) {
      this.logger.debug('Previous transaction sync still running, skipping...');
      return;
    }

    this.isSyncingTransactions = true;
    try {
      const count = await this.cardSyncService.syncAllTransactions();
      if (count > 0) {
        this.logger.log(`Transaction sync completed: ${count} new transactions`);
      }
    } catch (error) {
      this.logger.error(`Transaction sync failed: ${error.message}`, error.stack);
    } finally {
      this.isSyncingTransactions = false;
    }
  }

  /**
   * 同步发行余额 - 每30分钟执行
   * 更新各服务商的发行余额
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncIssuingBalances() {
    if (this.isSyncingBalances) {
      this.logger.debug('Previous balance sync still running, skipping...');
      return;
    }

    this.isSyncingBalances = true;
    try {
      const count = await this.cardSyncService.syncAllIssuingBalances();
      if (count > 0) {
        this.logger.log(`Balance sync completed: ${count} balances updated`);
      }
    } catch (error) {
      this.logger.error(`Balance sync failed: ${error.message}`, error.stack);
    } finally {
      this.isSyncingBalances = false;
    }
  }

  /**
   * 每日凌晨重置统计数据
   * 主要用于重置日限额计数器
   */
  @Cron('0 0 0 * * *') // 每天 00:00
  async dailyReset() {
    this.logger.log('Running daily reset tasks...');
    // 日限额重置由数据库触发器或服务商处理
    // 这里可以添加本地统计重置逻辑
  }

  /**
   * 每月1日凌晨重置月度统计
   */
  @Cron('0 0 0 1 * *') // 每月1日 00:00
  async monthlyReset() {
    this.logger.log('Running monthly reset tasks...');
    // 月限额重置由数据库触发器或服务商处理
    // 这里可以添加本地统计重置逻辑
  }
}
