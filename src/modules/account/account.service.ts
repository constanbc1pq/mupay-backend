import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User } from '@database/entities/user.entity';
import { Wallet } from '@database/entities/wallet.entity';
import { Card, CardStatus } from '@database/entities/card.entity';
import { AccountDeletion, DeletionStatus } from '@database/entities/account-deletion.entity';
import { MSG } from '@common/constants/messages';
import { RequestDeletionDto } from './dto/account.dto';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  private readonly COOLING_PERIOD_DAYS = 7;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Card)
    private cardRepository: Repository<Card>,
    @InjectRepository(AccountDeletion)
    private deletionRepository: Repository<AccountDeletion>,
  ) {}

  async checkDeletionConditions(userId: string) {
    const blockers: string[] = [];

    // Check balance
    const wallet = await this.walletRepository.findOne({ where: { userId } });
    const balance = wallet ? Number(wallet.balance) + Number(wallet.frozenBalance) : 0;

    if (balance > 0) {
      blockers.push('ACCOUNT_HAS_BALANCE');
    }

    // Check pending orders (simplified - you may want to check various order types)
    // For now, just check if there are any frozen funds
    if (wallet && Number(wallet.frozenBalance) > 0) {
      blockers.push('ACCOUNT_HAS_PENDING_ORDERS');
    }

    // Check active cards
    const activeCards = await this.cardRepository.count({
      where: { userId, status: CardStatus.ACTIVE },
    });

    if (activeCards > 0) {
      blockers.push('ACCOUNT_HAS_ACTIVE_CARDS');
    }

    return {
      canDelete: blockers.length === 0,
      blockers: blockers.length > 0 ? blockers : undefined,
      balance,
      hasPendingOrders: wallet ? Number(wallet.frozenBalance) > 0 : false,
      hasActiveCards: activeCards > 0,
    };
  }

  async requestDeletion(userId: string, dto: RequestDeletionDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    // Check if already has pending deletion
    const existingRequest = await this.deletionRepository.findOne({
      where: { userId, status: DeletionStatus.PENDING },
    });
    if (existingRequest) {
      throw new BadRequestException(MSG.ACCOUNT_DELETION_PENDING);
    }

    // Check conditions
    const conditions = await this.checkDeletionConditions(userId);
    if (!conditions.canDelete) {
      if (conditions.blockers?.includes('ACCOUNT_HAS_BALANCE')) {
        throw new BadRequestException(MSG.ACCOUNT_HAS_BALANCE);
      }
      if (conditions.blockers?.includes('ACCOUNT_HAS_PENDING_ORDERS')) {
        throw new BadRequestException(MSG.ACCOUNT_HAS_PENDING_ORDERS);
      }
      if (conditions.blockers?.includes('ACCOUNT_HAS_ACTIVE_CARDS')) {
        throw new BadRequestException(MSG.ACCOUNT_HAS_ACTIVE_CARDS);
      }
    }

    // Create deletion request
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + this.COOLING_PERIOD_DAYS);

    const deletion = this.deletionRepository.create({
      userId,
      reason: dto.reason,
      status: DeletionStatus.PENDING,
      scheduledAt,
    });

    await this.deletionRepository.save(deletion);

    return { messageId: MSG.ACCOUNT_DELETION_REQUESTED };
  }

  async cancelDeletion(userId: string) {
    const deletion = await this.deletionRepository.findOne({
      where: { userId, status: DeletionStatus.PENDING },
    });

    if (!deletion) {
      throw new NotFoundException(MSG.NOT_FOUND);
    }

    deletion.status = DeletionStatus.CANCELLED;
    deletion.cancelledAt = new Date();
    await this.deletionRepository.save(deletion);

    return { messageId: MSG.ACCOUNT_DELETION_CANCELLED };
  }

  async getDeletionStatus(userId: string) {
    const deletion = await this.deletionRepository.findOne({
      where: { userId, status: DeletionStatus.PENDING },
    });

    if (!deletion) {
      return {
        hasPendingRequest: false,
      };
    }

    const now = new Date();
    const remainingMs = deletion.scheduledAt.getTime() - now.getTime();
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

    return {
      hasPendingRequest: true,
      requestedAt: deletion.requestedAt,
      scheduledAt: deletion.scheduledAt,
      remainingDays: Math.max(0, remainingDays),
    };
  }

  // Cron job to process scheduled deletions
  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledDeletions() {
    const now = new Date();

    const pendingDeletions = await this.deletionRepository.find({
      where: { status: DeletionStatus.PENDING },
    });

    for (const deletion of pendingDeletions) {
      if (deletion.scheduledAt <= now) {
        try {
          await this.executeAccountDeletion(deletion);
        } catch (error) {
          this.logger.error(`Failed to delete account ${deletion.userId}`, error);
        }
      }
    }
  }

  private async executeAccountDeletion(deletion: AccountDeletion) {
    const userId = deletion.userId;

    // Re-check conditions before deletion
    const conditions = await this.checkDeletionConditions(userId);
    if (!conditions.canDelete) {
      this.logger.warn(`Cannot delete account ${userId}: conditions not met`);
      return;
    }

    // Anonymize user data instead of hard delete
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;

    // Anonymize personal data
    user.username = `deleted_${userId.substring(0, 8)}`;
    user.email = `deleted_${userId.substring(0, 8)}@deleted.local`;
    user.phone = null as any;
    user.nickname = null as any;
    user.avatar = null as any;
    user.password = '';
    user.paymentPassword = null as any;
    user.googleId = null as any;
    user.twoFactorSecret = null as any;
    user.twoFactorEnabled = false;
    user.status = 'deleted';

    await this.userRepository.save(user);

    // Mark deletion as completed
    deletion.status = DeletionStatus.COMPLETED;
    deletion.completedAt = new Date();
    await this.deletionRepository.save(deletion);

    this.logger.log(`Account ${userId} has been deleted (anonymized)`);
  }
}
