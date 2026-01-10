import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsdtWithdraw } from '@database/entities/usdt-withdraw.entity';
import { Transfer } from '@database/entities/transfer.entity';
import { MSG } from '@common/constants/messages';
import { PaginatedResponse } from '@common/dto/api-response.dto';

export interface GetWithdrawsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  network?: string;
}

export interface GetTransfersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

@Injectable()
export class AdminFinanceService {
  constructor(
    @InjectRepository(UsdtWithdraw)
    private withdrawRepository: Repository<UsdtWithdraw>,
    @InjectRepository(Transfer)
    private transferRepository: Repository<Transfer>,
  ) {}

  // ==================== Withdraws ====================

  async getWithdraws(params: GetWithdrawsParams) {
    const { page = 1, pageSize = 10, search, status, network } = params;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.withdrawRepository
      .createQueryBuilder('withdraw')
      .leftJoinAndSelect('withdraw.user', 'user')
      .orderBy('withdraw.createdAt', 'DESC')
      .skip(skip)
      .take(pageSize);

    if (search) {
      queryBuilder.andWhere(
        '(user.username LIKE :search OR withdraw.address LIKE :search OR withdraw.txHash LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('withdraw.status = :status', { status });
    }

    if (network) {
      queryBuilder.andWhere('withdraw.network = :network', { network });
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponse(
      items.map(item => ({
        id: item.id,
        userId: item.userId,
        username: item.user?.username,
        network: item.network,
        address: item.address,
        amount: Number(item.amount),
        fee: Number(item.fee),
        status: item.status,
        txHash: item.txHash,
        createdAt: item.createdAt,
        completedAt: item.completedAt,
      })),
      total,
      page,
      pageSize,
    );
  }

  async getWithdrawDetail(id: string) {
    const withdraw = await this.withdrawRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!withdraw) {
      throw new NotFoundException(MSG.NOT_FOUND);
    }

    return {
      id: withdraw.id,
      userId: withdraw.userId,
      username: withdraw.user?.username,
      email: withdraw.user?.email,
      network: withdraw.network,
      address: withdraw.address,
      amount: Number(withdraw.amount),
      fee: Number(withdraw.fee),
      netAmount: Number(withdraw.amount) - Number(withdraw.fee),
      status: withdraw.status,
      txHash: withdraw.txHash,
      createdAt: withdraw.createdAt,
      completedAt: withdraw.completedAt,
    };
  }

  async updateWithdrawStatus(id: string, status: string, txHash?: string) {
    const withdraw = await this.withdrawRepository.findOne({ where: { id } });

    if (!withdraw) {
      throw new NotFoundException(MSG.NOT_FOUND);
    }

    withdraw.status = status as any;
    if (txHash) {
      withdraw.txHash = txHash;
    }
    if (status === 'completed') {
      withdraw.completedAt = new Date();
    }

    await this.withdrawRepository.save(withdraw);
    return { success: true };
  }

  // ==================== Transfers ====================

  async getTransfers(params: GetTransfersParams) {
    const { page = 1, pageSize = 10, search, status } = params;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.transferRepository
      .createQueryBuilder('transfer')
      .leftJoinAndSelect('transfer.fromUser', 'fromUser')
      .leftJoinAndSelect('transfer.toUser', 'toUser')
      .orderBy('transfer.createdAt', 'DESC')
      .skip(skip)
      .take(pageSize);

    if (search) {
      queryBuilder.andWhere(
        '(fromUser.username LIKE :search OR toUser.username LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('transfer.status = :status', { status });
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponse(
      items.map(item => ({
        id: item.id,
        fromUserId: item.fromUserId,
        fromUsername: item.fromUser?.username,
        toUserId: item.toUserId,
        toUsername: item.toUser?.username,
        amount: Number(item.amount),
        remark: item.remark,
        status: item.status,
        createdAt: item.createdAt,
        completedAt: item.completedAt,
      })),
      total,
      page,
      pageSize,
    );
  }

  async getTransferDetail(id: string) {
    const transfer = await this.transferRepository.findOne({
      where: { id },
      relations: ['fromUser', 'toUser'],
    });

    if (!transfer) {
      throw new NotFoundException(MSG.NOT_FOUND);
    }

    return {
      id: transfer.id,
      fromUserId: transfer.fromUserId,
      fromUsername: transfer.fromUser?.username,
      fromEmail: transfer.fromUser?.email,
      toUserId: transfer.toUserId,
      toUsername: transfer.toUser?.username,
      toEmail: transfer.toUser?.email,
      amount: Number(transfer.amount),
      remark: transfer.remark,
      status: transfer.status,
      createdAt: transfer.createdAt,
      completedAt: transfer.completedAt,
    };
  }
}
