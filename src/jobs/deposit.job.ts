import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DepositService } from '@modules/deposit/deposit.service';
import { SweepService } from '@services/blockchain/sweep.service';

@Injectable()
export class DepositJob {
  private readonly logger = new Logger(DepositJob.name);
  private isScanning = false;
  private isConfirming = false;
  private isSweeping = false;

  constructor(
    private readonly depositService: DepositService,
    private readonly sweepService: SweepService,
  ) {}

  /**
   * Scan for new deposits every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scanDeposits() {
    if (this.isScanning) {
      this.logger.debug('Previous scan still running, skipping...');
      return;
    }

    this.isScanning = true;
    try {
      const count = await this.depositService.processNewDeposits();
      if (count > 0) {
        this.logger.log(`Processed ${count} new deposit(s)`);
      }
    } catch (error) {
      this.logger.error('Error scanning deposits:', error);
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Confirm pending deposits every 30 seconds
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async confirmDeposits() {
    if (this.isConfirming) {
      this.logger.debug('Previous confirmation still running, skipping...');
      return;
    }

    this.isConfirming = true;
    try {
      const count = await this.depositService.confirmPendingDeposits();
      if (count > 0) {
        this.logger.log(`Confirmed ${count} deposit(s)`);
      }
    } catch (error) {
      this.logger.error('Error confirming deposits:', error);
    } finally {
      this.isConfirming = false;
    }
  }

  /**
   * Sweep funds to hot wallet every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sweepFunds() {
    if (this.isSweeping) {
      this.logger.debug('Previous sweep still running, skipping...');
      return;
    }

    this.isSweeping = true;
    try {
      const results = await this.sweepService.sweepAll();

      for (const [network, networkResults] of Object.entries(results)) {
        const successCount = networkResults.filter((r) => r.success).length;
        const totalAmount = networkResults
          .filter((r) => r.success)
          .reduce((sum, r) => sum + r.amount, 0);

        if (successCount > 0) {
          this.logger.log(
            `Swept ${successCount} addresses on ${network}: ${totalAmount} USDT`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error sweeping funds:', error);
    } finally {
      this.isSweeping = false;
    }
  }

  /**
   * Expire pending orders every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireOrders() {
    try {
      const count = await this.depositService.expirePendingOrders();
      if (count > 0) {
        this.logger.log(`Expired ${count} order(s)`);
      }
    } catch (error) {
      this.logger.error('Error expiring orders:', error);
    }
  }
}
