import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Agent, AgentStatus } from '@database/entities/agent.entity';
import { Referral } from '@database/entities/referral.entity';
import { AgentEarning, EarningType } from '@database/entities/agent-earning.entity';
import { AgentPolicy, AgentPolicyStatus } from '@database/entities/agent-policy.entity';
import { User } from '@database/entities/user.entity';
import { MSG } from '@common/constants/messages';
import { WalletService } from '../wallet/wallet.service';
import { PaginationQueryDto, PaginatedResponse } from '@common/dto/api-response.dto';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly AGENT_APPLICATION_FEE = 588;

  constructor(
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(Referral)
    private referralRepository: Repository<Referral>,
    @InjectRepository(AgentEarning)
    private earningRepository: Repository<AgentEarning>,
    @InjectRepository(AgentPolicy)
    private policyRepository: Repository<AgentPolicy>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private walletService: WalletService,
  ) {}

  async getAgentInfo(userId: string) {
    const agent = await this.agentRepository.findOne({
      where: { userId },
    });

    if (!agent) {
      return {
        isAgent: false,
        applicationFee: this.AGENT_APPLICATION_FEE,
      };
    }

    // Get referral counts
    const level1Count = await this.referralRepository.count({
      where: { agentId: agent.id, level: 1 },
    });
    const level2Count = await this.referralRepository.count({
      where: { agentId: agent.id, level: 2 },
    });

    // Get this month's earnings
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyEarnings = await this.earningRepository
      .createQueryBuilder('earning')
      .where('earning.agentId = :agentId', { agentId: agent.id })
      .andWhere('earning.createdAt >= :startOfMonth', { startOfMonth })
      .select('SUM(earning.amount)', 'total')
      .getRawOne();

    return {
      isAgent: true,
      agentId: agent.id,
      inviteCode: agent.inviteCode,
      totalEarnings: agent.totalEarnings,
      thisMonthEarnings: monthlyEarnings?.total || 0,
      level1Count,
      level2Count,
      applyTime: agent.applyTime,
      status: agent.status,
    };
  }

  async applyAgent(userId: string) {
    // Check if already an agent
    const existingAgent = await this.agentRepository.findOne({
      where: { userId },
    });

    if (existingAgent) {
      throw new BadRequestException(MSG.AGENT_ALREADY_APPLIED);
    }

    // Check balance
    const wallet = await this.walletService.getWalletByUserId(userId);
    if (Number(wallet.balance) < this.AGENT_APPLICATION_FEE) {
      throw new BadRequestException(MSG.WALLET_BALANCE_INSUFFICIENT);
    }

    // Deduct fee
    await this.walletService.updateBalance(userId, -this.AGENT_APPLICATION_FEE);

    // Generate invite code
    const inviteCode = this.generateInviteCode();

    // Create agent
    const agent = this.agentRepository.create({
      userId,
      inviteCode,
      totalEarnings: 0,
      status: AgentStatus.ACTIVE,
      applyTime: new Date(),
    });

    await this.agentRepository.save(agent);

    // Update user isAgent flag
    await this.userRepository.update(userId, { isAgent: true });

    return {
      messageId: MSG.AGENT_APPLY_SUCCESS,
      agentId: agent.id,
      inviteCode: agent.inviteCode,
    };
  }

  async getReferrals(userId: string, query: PaginationQueryDto, level?: string) {
    const agent = await this.getAgentOrFail(userId);

    const { page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.referralRepository
      .createQueryBuilder('referral')
      .leftJoinAndSelect('referral.referredUser', 'user')
      .where('referral.agentId = :agentId', { agentId: agent.id });

    if (level && level !== 'all') {
      queryBuilder.andWhere('referral.level = :level', { level: parseInt(level) });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .orderBy('referral.createdAt', 'DESC')
      .getManyAndCount();

    const referrals = items.map((r) => ({
      id: r.id,
      userId: r.referredUserId,
      nickname: r.referredUser?.nickname,
      avatar: r.referredUser?.avatar,
      level: r.level,
      registerTime: r.createdAt,
    }));

    return new PaginatedResponse(referrals, total, page, pageSize);
  }

  async getEarnings(userId: string, query: PaginationQueryDto, type?: string) {
    const agent = await this.getAgentOrFail(userId);

    const { page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.earningRepository
      .createQueryBuilder('earning')
      .leftJoinAndSelect('earning.fromUser', 'user')
      .where('earning.agentId = :agentId', { agentId: agent.id });

    if (type && type !== 'all') {
      queryBuilder.andWhere('earning.type = :type', { type });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .orderBy('earning.createdAt', 'DESC')
      .getManyAndCount();

    const earnings = items.map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount,
      fromUserName: e.fromUser?.nickname || e.fromUser?.username,
      level: e.level,
      createdAt: e.createdAt,
    }));

    return new PaginatedResponse(earnings, total, page, pageSize);
  }

  async getEarningsSummary(userId: string) {
    const agent = await this.getAgentOrFail(userId);

    const summary = await this.earningRepository
      .createQueryBuilder('earning')
      .where('earning.agentId = :agentId', { agentId: agent.id })
      .select('earning.type', 'type')
      .addSelect('SUM(earning.amount)', 'total')
      .groupBy('earning.type')
      .getRawMany();

    const result: Record<string, number> = {
      card_open: 0,
      monthly_fee: 0,
      card_recharge: 0,
      remittance: 0,
    };

    summary.forEach((s) => {
      result[s.type] = parseFloat(s.total) || 0;
    });

    return {
      totalEarnings: agent.totalEarnings,
      byType: result,
    };
  }

  async getInviteInfo(userId: string) {
    const agent = await this.getAgentOrFail(userId);

    return {
      inviteCode: agent.inviteCode,
      inviteLink: `https://mupay.app/invite/${agent.inviteCode}`,
      qrCodeUrl: `https://api.mupay.com/api/qr/${agent.inviteCode}`,
    };
  }

  async getRanking(userId: string) {
    const agent = await this.agentRepository.findOne({ where: { userId } });

    // Get top 10 agents by earnings
    const topAgents = await this.agentRepository
      .createQueryBuilder('agent')
      .leftJoinAndSelect('agent.user', 'user')
      .orderBy('agent.totalEarnings', 'DESC')
      .take(10)
      .getMany();

    const ranking = topAgents.map((a, index) => ({
      rank: index + 1,
      agentId: a.id,
      nickname: a.user?.nickname || a.user?.username,
      avatar: a.user?.avatar,
      earnings: a.totalEarnings,
      isCurrentUser: agent && a.id === agent.id,
    }));

    // Find current user's rank if not in top 10
    let currentUserRank = null;
    if (agent) {
      const rank = await this.agentRepository
        .createQueryBuilder('agent')
        .where('agent.totalEarnings > :earnings', { earnings: agent.totalEarnings })
        .getCount();
      currentUserRank = rank + 1;
    }

    return {
      ranking,
      currentUserRank,
    };
  }

  private async getAgentOrFail(userId: string): Promise<Agent> {
    const agent = await this.agentRepository.findOne({ where: { userId } });
    if (!agent) {
      throw new BadRequestException(MSG.AGENT_NOT_FOUND);
    }
    return agent;
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'MU';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // ============ 代理商政策相关 ============

  /**
   * 获取可用代理政策列表
   */
  async getPolicies() {
    const policies = await this.policyRepository.find({
      where: { status: AgentPolicyStatus.ACTIVE },
      relations: ['provider'],
      order: { createdAt: 'ASC' },
    });

    return policies.map((policy) => ({
      id: policy.id,
      providerId: policy.providerId,
      providerName: policy.provider?.name || 'Unknown',
      providerCode: policy.provider?.code || 'unknown',
      name: policy.name,
      description: policy.description,
      commissionRates: {
        cardOpen: Number(policy.cardOpenCommissionRate),
        monthlyFee: Number(policy.monthlyFeeCommissionRate),
        recharge: Number(policy.rechargeCommissionRate),
        transaction: Number(policy.transactionCommissionRate),
      },
      levelRates: {
        level1: Number(policy.level1Rate),
        level2: Number(policy.level2Rate),
      },
      minPayout: Number(policy.minPayout),
    }));
  }

  /**
   * 按服务商分组的收益统计
   */
  async getEarningsByProvider(userId: string) {
    const agent = await this.getAgentOrFail(userId);

    const earningsByProvider = await this.earningRepository
      .createQueryBuilder('earning')
      .leftJoin('earning.provider', 'provider')
      .where('earning.agentId = :agentId', { agentId: agent.id })
      .select('earning.providerId', 'providerId')
      .addSelect('provider.name', 'providerName')
      .addSelect('provider.code', 'providerCode')
      .addSelect('earning.type', 'type')
      .addSelect('SUM(earning.amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .groupBy('earning.providerId')
      .addGroupBy('provider.name')
      .addGroupBy('provider.code')
      .addGroupBy('earning.type')
      .getRawMany();

    // 按服务商分组整理数据
    const providerMap = new Map<string, any>();

    for (const row of earningsByProvider) {
      const providerId = row.providerId || 'legacy';
      if (!providerMap.has(providerId)) {
        providerMap.set(providerId, {
          providerId,
          providerName: row.providerName || 'Legacy',
          providerCode: row.providerCode || 'legacy',
          totalEarnings: 0,
          byType: {
            card_open: 0,
            monthly_fee: 0,
            card_recharge: 0,
            remittance: 0,
          },
          transactionCount: 0,
        });
      }

      const providerData = providerMap.get(providerId);
      const amount = parseFloat(row.total) || 0;
      providerData.totalEarnings += amount;
      providerData.byType[row.type] = amount;
      providerData.transactionCount += parseInt(row.count) || 0;
    }

    return {
      totalEarnings: agent.totalEarnings,
      byProvider: Array.from(providerMap.values()),
    };
  }

  /**
   * 获取指定服务商的代理政策
   */
  async getPolicyByProvider(providerId: string): Promise<AgentPolicy | null> {
    return this.policyRepository.findOne({
      where: { providerId, status: AgentPolicyStatus.ACTIVE },
    });
  }

  /**
   * 计算佣金 (支持多服务商政策)
   */
  async calculateCommission(
    agentId: string,
    type: EarningType,
    baseAmount: number,
    providerId?: string,
    level: number = 1,
  ): Promise<number> {
    // 尝试获取服务商特定政策
    let policy: AgentPolicy | null = null;
    if (providerId) {
      policy = await this.getPolicyByProvider(providerId);
    }

    // 使用政策费率或默认费率
    let commissionRate = 0;
    let levelRate = level === 1 ? 1.0 : 0.1;

    if (policy) {
      levelRate = level === 1 ? Number(policy.level1Rate) : Number(policy.level2Rate);

      switch (type) {
        case EarningType.CARD_OPEN:
          commissionRate = Number(policy.cardOpenCommissionRate);
          break;
        case EarningType.MONTHLY_FEE:
          commissionRate = Number(policy.monthlyFeeCommissionRate);
          break;
        case EarningType.CARD_RECHARGE:
          commissionRate = Number(policy.rechargeCommissionRate);
          break;
        case EarningType.REMITTANCE:
          commissionRate = Number(policy.transactionCommissionRate);
          break;
      }
    } else {
      // 默认费率 (无服务商政策时)
      switch (type) {
        case EarningType.CARD_OPEN:
          commissionRate = 0.05; // 5%
          break;
        case EarningType.MONTHLY_FEE:
          commissionRate = 0.10; // 10%
          break;
        case EarningType.CARD_RECHARGE:
          commissionRate = 0.02; // 2%
          break;
        case EarningType.REMITTANCE:
          commissionRate = 0.01; // 1%
          break;
      }
    }

    const commission = baseAmount * commissionRate * levelRate;
    return Math.round(commission * 100) / 100; // 保留两位小数
  }

  /**
   * 记录代理商收益 (支持服务商)
   */
  async recordEarning(
    agentId: string,
    type: EarningType,
    amount: number,
    fromUserId: string,
    level: number,
    relatedOrderId?: string,
    providerId?: string,
  ): Promise<AgentEarning> {
    const earning = this.earningRepository.create({
      agentId,
      type,
      amount,
      fromUserId,
      level,
      relatedOrderId,
      providerId,
    });

    await this.earningRepository.save(earning);

    // 更新代理商总收益
    await this.agentRepository.increment({ id: agentId }, 'totalEarnings', amount);

    this.logger.log(
      `Agent earning recorded: agentId=${agentId}, type=${type}, amount=${amount}, providerId=${providerId || 'none'}`,
    );

    return earning;
  }
}
