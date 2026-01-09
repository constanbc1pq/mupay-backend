import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { DepositLimit, LimitScope } from '@database/entities/deposit-limit.entity';
import { DepositOrder, DepositMethod } from '@database/entities/deposit-order.entity';
import { User } from '@database/entities/user.entity';

interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  limit?: {
    minAmount: number;
    maxAmount: number;
    dailyLimit: number;
    dailyUsed: number;
    dailyRemaining: number;
    weeklyLimit: number;
    weeklyUsed: number;
    weeklyRemaining: number;
    monthlyLimit: number;
    monthlyUsed: number;
    monthlyRemaining: number;
    dailyCount: number;
    dailyCountUsed: number;
    dailyCountRemaining: number;
  };
}

@Injectable()
export class DepositLimitService {
  private readonly logger = new Logger(DepositLimitService.name);

  constructor(
    @InjectRepository(DepositLimit)
    private limitRepo: Repository<DepositLimit>,
    @InjectRepository(DepositOrder)
    private orderRepo: Repository<DepositOrder>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * Get applicable limits for a user and deposit method
   */
  async getApplicableLimits(
    userId: string,
    method: DepositMethod,
    network?: string,
  ): Promise<DepositLimit | null> {
    // Get user for VIP level
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const vipLevel = user?.vipLevel || 0;

    // Find limits with priority:
    // 1. User-specific limit
    // 2. VIP level limit
    // 3. Method + network specific global limit
    // 4. Method specific global limit
    // 5. Global limit (all methods)
    const limits = await this.limitRepo.find({
      where: { isEnabled: true },
      order: { priority: 'DESC' },
    });

    // Filter applicable limits
    const applicableLimits = limits.filter((limit) => {
      // Check method match
      if (limit.method && limit.method !== method) return false;

      // Check network match (for crypto)
      if (limit.network && network && limit.network !== network) return false;

      // Check scope match
      switch (limit.scope) {
        case 'USER':
          return limit.scopeValue === userId;
        case 'VIP_LEVEL':
          return limit.scopeValue === String(vipLevel);
        case 'GLOBAL':
          return true;
        default:
          return false;
      }
    });

    // Return the highest priority limit
    return applicableLimits[0] || null;
  }

  /**
   * Check if a deposit amount is within limits
   */
  async checkLimits(
    userId: string,
    method: DepositMethod,
    amount: number,
    network?: string,
  ): Promise<LimitCheckResult> {
    const limit = await this.getApplicableLimits(userId, method, network);

    if (!limit) {
      // No limits configured, use defaults
      return {
        allowed: true,
        limit: {
          minAmount: 10,
          maxAmount: 100000,
          dailyLimit: 0,
          dailyUsed: 0,
          dailyRemaining: 0,
          weeklyLimit: 0,
          weeklyUsed: 0,
          weeklyRemaining: 0,
          monthlyLimit: 0,
          monthlyUsed: 0,
          monthlyRemaining: 0,
          dailyCount: 0,
          dailyCountUsed: 0,
          dailyCountRemaining: 0,
        },
      };
    }

    // Check min/max amount
    if (amount < limit.minAmount) {
      return {
        allowed: false,
        reason: `Minimum deposit amount is $${limit.minAmount}`,
      };
    }

    if (amount > limit.maxAmount) {
      return {
        allowed: false,
        reason: `Maximum deposit amount is $${limit.maxAmount}`,
      };
    }

    // Get period usage
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dailyStats, weeklyStats, monthlyStats] = await Promise.all([
      this.getUsageStats(userId, method, startOfDay, network),
      this.getUsageStats(userId, method, startOfWeek, network),
      this.getUsageStats(userId, method, startOfMonth, network),
    ]);

    // Check daily limit
    if (limit.dailyLimit > 0 && dailyStats.totalAmount + amount > limit.dailyLimit) {
      return {
        allowed: false,
        reason: `Daily deposit limit ($${limit.dailyLimit}) exceeded. Used: $${dailyStats.totalAmount}`,
      };
    }

    // Check weekly limit
    if (limit.weeklyLimit > 0 && weeklyStats.totalAmount + amount > limit.weeklyLimit) {
      return {
        allowed: false,
        reason: `Weekly deposit limit ($${limit.weeklyLimit}) exceeded. Used: $${weeklyStats.totalAmount}`,
      };
    }

    // Check monthly limit
    if (limit.monthlyLimit > 0 && monthlyStats.totalAmount + amount > limit.monthlyLimit) {
      return {
        allowed: false,
        reason: `Monthly deposit limit ($${limit.monthlyLimit}) exceeded. Used: $${monthlyStats.totalAmount}`,
      };
    }

    // Check daily count
    if (limit.dailyCount > 0 && dailyStats.count >= limit.dailyCount) {
      return {
        allowed: false,
        reason: `Daily deposit count limit (${limit.dailyCount}) exceeded`,
      };
    }

    // Check weekly count
    if (limit.weeklyCount > 0 && weeklyStats.count >= limit.weeklyCount) {
      return {
        allowed: false,
        reason: `Weekly deposit count limit (${limit.weeklyCount}) exceeded`,
      };
    }

    // Check monthly count
    if (limit.monthlyCount > 0 && monthlyStats.count >= limit.monthlyCount) {
      return {
        allowed: false,
        reason: `Monthly deposit count limit (${limit.monthlyCount}) exceeded`,
      };
    }

    return {
      allowed: true,
      limit: {
        minAmount: Number(limit.minAmount),
        maxAmount: Number(limit.maxAmount),
        dailyLimit: Number(limit.dailyLimit),
        dailyUsed: dailyStats.totalAmount,
        dailyRemaining: limit.dailyLimit > 0 ? limit.dailyLimit - dailyStats.totalAmount : 0,
        weeklyLimit: Number(limit.weeklyLimit),
        weeklyUsed: weeklyStats.totalAmount,
        weeklyRemaining: limit.weeklyLimit > 0 ? limit.weeklyLimit - weeklyStats.totalAmount : 0,
        monthlyLimit: Number(limit.monthlyLimit),
        monthlyUsed: monthlyStats.totalAmount,
        monthlyRemaining: limit.monthlyLimit > 0 ? limit.monthlyLimit - monthlyStats.totalAmount : 0,
        dailyCount: limit.dailyCount,
        dailyCountUsed: dailyStats.count,
        dailyCountRemaining: limit.dailyCount > 0 ? limit.dailyCount - dailyStats.count : 0,
      },
    };
  }

  /**
   * Get usage statistics for a period
   */
  private async getUsageStats(
    userId: string,
    method: DepositMethod,
    startDate: Date,
    network?: string,
  ): Promise<{ totalAmount: number; count: number }> {
    const where: Record<string, unknown> = {
      userId,
      method,
      status: 'COMPLETED',
      completedAt: MoreThan(startDate),
    };

    if (network) {
      where.network = network;
    }

    const orders = await this.orderRepo.find({ where });

    const totalAmount = orders.reduce((sum, order) => sum + Number(order.amount), 0);
    const count = orders.length;

    return { totalAmount, count };
  }

  /**
   * Validate deposit amount before creating order
   */
  async validateDeposit(
    userId: string,
    method: DepositMethod,
    amount: number,
    network?: string,
  ): Promise<void> {
    const result = await this.checkLimits(userId, method, amount, network);

    if (!result.allowed) {
      throw new BadRequestException(result.reason);
    }
  }

  /**
   * Get user's current deposit limits and usage
   */
  async getUserLimits(
    userId: string,
    method: DepositMethod,
    network?: string,
  ): Promise<LimitCheckResult['limit']> {
    const result = await this.checkLimits(userId, method, 0, network);
    return result.limit;
  }

  // Admin methods for managing limits

  /**
   * Create a new deposit limit
   */
  async createLimit(data: Partial<DepositLimit>): Promise<DepositLimit> {
    const limit = this.limitRepo.create(data);
    return this.limitRepo.save(limit);
  }

  /**
   * Update a deposit limit
   */
  async updateLimit(id: string, data: Partial<DepositLimit>): Promise<DepositLimit> {
    await this.limitRepo.update(id, data);
    const limit = await this.limitRepo.findOne({ where: { id } });
    if (!limit) {
      throw new BadRequestException('Limit not found');
    }
    return limit;
  }

  /**
   * Delete a deposit limit
   */
  async deleteLimit(id: string): Promise<void> {
    await this.limitRepo.delete(id);
  }

  /**
   * Get all limits
   */
  async getAllLimits(): Promise<DepositLimit[]> {
    return this.limitRepo.find({
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Get limit by ID
   */
  async getLimitById(id: string): Promise<DepositLimit | null> {
    return this.limitRepo.findOne({ where: { id } });
  }

  /**
   * Initialize default limits if none exist
   */
  async initializeDefaultLimits(): Promise<void> {
    const existingLimits = await this.limitRepo.count();
    if (existingLimits > 0) {
      return;
    }

    const defaultLimits: Partial<DepositLimit>[] = [
      // Global crypto limits
      {
        method: 'CRYPTO',
        scope: 'GLOBAL',
        minAmount: 10,
        maxAmount: 100000,
        dailyLimit: 50000,
        weeklyLimit: 100000,
        monthlyLimit: 500000,
        dailyCount: 10,
        priority: 1,
        remark: 'Default crypto deposit limits',
      },
      // Global card limits
      {
        method: 'CARD',
        scope: 'GLOBAL',
        minAmount: 50,
        maxAmount: 5000,
        dailyLimit: 10000,
        weeklyLimit: 30000,
        monthlyLimit: 100000,
        dailyCount: 5,
        priority: 1,
        remark: 'Default card deposit limits',
      },
      // Global PayPal limits
      {
        method: 'PAYPAL',
        scope: 'GLOBAL',
        minAmount: 50,
        maxAmount: 5000,
        dailyLimit: 10000,
        weeklyLimit: 30000,
        monthlyLimit: 100000,
        dailyCount: 5,
        priority: 1,
        remark: 'Default PayPal deposit limits',
      },
    ];

    for (const limitData of defaultLimits) {
      await this.createLimit(limitData);
    }

    this.logger.log('Default deposit limits initialized');
  }
}
