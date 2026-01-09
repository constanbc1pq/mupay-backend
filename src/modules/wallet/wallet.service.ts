import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Wallet } from '@database/entities/wallet.entity';
import { Transaction } from '@database/entities/transaction.entity';
import { MSG } from '@common/constants/messages';
import { PaginationQueryDto, PaginatedResponse } from '@common/dto/api-response.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  async getBalance(userId: string) {
    let wallet = await this.walletRepository.findOne({ where: { userId } });

    // Create wallet if not exists
    if (!wallet) {
      wallet = await this.createWallet(userId);
    }

    return {
      balance: wallet.balance,
      frozenBalance: wallet.frozenBalance,
      currency: 'USDT',
    };
  }

  async getDepositAddress(userId: string, network?: string) {
    let wallet = await this.walletRepository.findOne({ where: { userId } });

    if (!wallet) {
      wallet = await this.createWallet(userId);
    }

    const addresses: Record<string, string> = {};

    if (!network || network === 'TRC20') {
      addresses.TRC20 = wallet.depositAddressTRC20;
    }
    if (!network || network === 'ERC20') {
      addresses.ERC20 = wallet.depositAddressERC20;
    }
    if (!network || network === 'BEP20') {
      addresses.BEP20 = wallet.depositAddressBEP20;
    }

    return {
      addresses,
      minDeposit: {
        TRC20: 10,
        ERC20: 50,
        BEP20: 10,
      },
      networkFee: {
        TRC20: 1,
        ERC20: 15,
        BEP20: 0.5,
      },
    };
  }

  async getTransactions(userId: string, query: PaginationQueryDto) {
    const { page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const [items, total] = await this.transactionRepository.findAndCount({
      where: { userId },
      skip,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return new PaginatedResponse(items, total, page, pageSize);
  }

  async getTransactionDetail(userId: string, transactionId: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId, userId },
    });

    if (!transaction) {
      throw new NotFoundException(MSG.WALLET_TRANSACTION_NOT_FOUND);
    }

    return transaction;
  }

  async createWallet(userId: string): Promise<Wallet> {
    // Generate mock deposit addresses
    const wallet = this.walletRepository.create({
      userId,
      balance: 0,
      frozenBalance: 0,
      depositAddressTRC20: `T${this.generateMockAddress()}`,
      depositAddressERC20: `0x${this.generateMockAddress()}`,
      depositAddressBEP20: `0x${this.generateMockAddress()}`,
    });

    return this.walletRepository.save(wallet);
  }

  async getWalletByUserId(userId: string): Promise<Wallet> {
    let wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      wallet = await this.createWallet(userId);
    }
    return wallet;
  }

  async updateBalance(userId: string, amount: number): Promise<void> {
    const wallet = await this.getWalletByUserId(userId);
    wallet.balance = Number(wallet.balance) + amount;
    await this.walletRepository.save(wallet);
  }

  private generateMockAddress(): string {
    return uuidv4().replace(/-/g, '').substring(0, 32);
  }
}
