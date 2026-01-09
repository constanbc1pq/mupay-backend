import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from '@database/entities/wallet.entity';
import { Transaction } from '@database/entities/transaction.entity';
import { DepositAddress, NetworkType } from '@database/entities/deposit-address.entity';
import { HdWalletService } from '@services/blockchain/hd-wallet.service';
import { MSG } from '@common/constants/messages';
import { PaginationQueryDto, PaginatedResponse } from '@common/dto/api-response.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(DepositAddress)
    private depositAddressRepository: Repository<DepositAddress>,
    private hdWalletService: HdWalletService,
    private dataSource: DataSource,
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get the next derivation index
      const maxIndexResult = await queryRunner.manager
        .createQueryBuilder(DepositAddress, 'da')
        .select('MAX(da.derivationIndex)', 'maxIndex')
        .getRawOne();
      const nextIndex = (maxIndexResult?.maxIndex ?? -1) + 1;

      // Derive addresses using HD Wallet
      const derivedAddresses = await this.hdWalletService.deriveAllAddresses(nextIndex);

      // Create wallet with derived addresses
      const wallet = queryRunner.manager.create(Wallet, {
        userId,
        balance: 0,
        frozenBalance: 0,
        depositAddressTRC20: derivedAddresses.find((a) => a.network === 'TRC20')?.address,
        depositAddressERC20: derivedAddresses.find((a) => a.network === 'ERC20')?.address,
        depositAddressBEP20: derivedAddresses.find((a) => a.network === 'BEP20')?.address,
      });

      const savedWallet = await queryRunner.manager.save(wallet);

      // Create deposit address records
      for (const addr of derivedAddresses) {
        const depositAddress = queryRunner.manager.create(DepositAddress, {
          userId,
          network: addr.network as NetworkType,
          address: addr.address,
          derivationIndex: nextIndex,
          derivationPath: addr.derivationPath,
          isActive: true,
        });
        await queryRunner.manager.save(depositAddress);
      }

      await queryRunner.commitTransaction();
      return savedWallet;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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

  async getDepositAddresses(userId: string): Promise<DepositAddress[]> {
    return this.depositAddressRepository.find({
      where: { userId, isActive: true },
    });
  }

  async getDepositAddressByAddress(
    address: string,
    network: NetworkType,
  ): Promise<DepositAddress | null> {
    return this.depositAddressRepository.findOne({
      where: { address, network, isActive: true },
    });
  }
}
