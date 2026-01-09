import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ethers, Contract, JsonRpcProvider } from 'ethers';
import { DepositAddress, NetworkType } from '@database/entities/deposit-address.entity';
import { DepositOrder } from '@database/entities/deposit-order.entity';

// ERC20/BEP20 ABI for balanceOf
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

interface PendingDeposit {
  userId: string;
  address: string;
  network: NetworkType;
  txHash: string;
  fromAddress: string;
  amount: number;
  blockNumber: number;
}

@Injectable()
export class BlockchainMonitorService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainMonitorService.name);

  private ethProvider: JsonRpcProvider;
  private bscProvider: JsonRpcProvider;
  private tronApiUrl: string;

  private usdtContractEth: Contract;
  private usdtContractBsc: Contract;
  private usdtContractTrc20: string;

  // Track last scanned block for each network
  private lastScannedBlock: Record<NetworkType, number> = {
    ERC20: 0,
    BEP20: 0,
    TRC20: 0,
  };

  // Required confirmations for each network
  private readonly CONFIRMATIONS: Record<NetworkType, number> = {
    TRC20: 20,
    ERC20: 12,
    BEP20: 15,
  };

  constructor(
    private configService: ConfigService,
    @InjectRepository(DepositAddress)
    private depositAddressRepo: Repository<DepositAddress>,
    @InjectRepository(DepositOrder)
    private depositOrderRepo: Repository<DepositOrder>,
  ) {}

  async onModuleInit() {
    // Initialize providers
    const ethRpcUrl = this.configService.get<string>('ETH_RPC_URL') || 'https://ethereum-sepolia-rpc.publicnode.com';
    const bscRpcUrl = this.configService.get<string>('BSC_RPC_URL') || 'https://bsc-testnet-rpc.publicnode.com';
    this.tronApiUrl = this.configService.get<string>('TRON_API_URL') || 'https://api.shasta.trongrid.io';

    this.ethProvider = new JsonRpcProvider(ethRpcUrl);
    this.bscProvider = new JsonRpcProvider(bscRpcUrl);

    // Initialize USDT contracts
    const usdtEth = this.configService.get<string>('USDT_CONTRACT_ETH') || '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0';
    const usdtBsc = this.configService.get<string>('USDT_CONTRACT_BSC') || '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd';
    this.usdtContractTrc20 = this.configService.get<string>('USDT_CONTRACT_TRC20') || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

    this.usdtContractEth = new Contract(usdtEth, ERC20_ABI, this.ethProvider);
    this.usdtContractBsc = new Contract(usdtBsc, ERC20_ABI, this.bscProvider);

    // Get current block numbers
    try {
      this.lastScannedBlock.ERC20 = await this.ethProvider.getBlockNumber();
      this.lastScannedBlock.BEP20 = await this.bscProvider.getBlockNumber();
    } catch (error) {
      this.logger.warn('Failed to get initial block numbers, using 0:', error);
    }

    this.logger.log('Blockchain Monitor Service initialized');
    this.logger.log(`ETH starting block: ${this.lastScannedBlock.ERC20}`);
    this.logger.log(`BSC starting block: ${this.lastScannedBlock.BEP20}`);
  }

  /**
   * Scan for new ERC20 USDT deposits
   */
  async scanERC20Deposits(): Promise<PendingDeposit[]> {
    return this.scanEVMDeposits('ERC20', this.ethProvider, this.usdtContractEth);
  }

  /**
   * Scan for new BEP20 USDT deposits
   */
  async scanBEP20Deposits(): Promise<PendingDeposit[]> {
    return this.scanEVMDeposits('BEP20', this.bscProvider, this.usdtContractBsc);
  }

  /**
   * Generic EVM chain deposit scanner
   */
  private async scanEVMDeposits(
    network: NetworkType,
    provider: JsonRpcProvider,
    contract: Contract,
  ): Promise<PendingDeposit[]> {
    const deposits: PendingDeposit[] = [];

    try {
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = this.lastScannedBlock[network] + 1;

      if (fromBlock > currentBlock) {
        return deposits;
      }

      // Get all active deposit addresses for this network
      const activeAddresses = await this.depositAddressRepo.find({
        where: { network, isActive: true },
      });

      if (activeAddresses.length === 0) {
        this.lastScannedBlock[network] = currentBlock;
        return deposits;
      }

      const addressMap = new Map(
        activeAddresses.map((a) => [a.address.toLowerCase(), a.userId]),
      );
      const addresses = Array.from(addressMap.keys());

      // Query Transfer events to any of our addresses
      const filter = contract.filters.Transfer(null, addresses);
      const events = await contract.queryFilter(filter, fromBlock, currentBlock);

      for (const event of events) {
        const log = event as ethers.EventLog;
        const toAddress = log.args[1].toLowerCase();
        const amount = Number(ethers.formatUnits(log.args[2], 6)); // USDT has 6 decimals

        if (addressMap.has(toAddress)) {
          const txHash = log.transactionHash;

          // Check if already processed
          const existing = await this.depositOrderRepo.findOne({
            where: { txHash, network },
          });

          if (!existing) {
            deposits.push({
              userId: addressMap.get(toAddress)!,
              address: toAddress,
              network,
              txHash,
              fromAddress: log.args[0].toLowerCase(),
              amount,
              blockNumber: log.blockNumber,
            });
          }
        }
      }

      this.lastScannedBlock[network] = currentBlock;
      this.logger.log(
        `Scanned ${network} blocks ${fromBlock}-${currentBlock}, found ${deposits.length} deposits`,
      );
    } catch (error) {
      this.logger.error(`Error scanning ${network} deposits:`, error);
    }

    return deposits;
  }

  /**
   * Scan for new TRC20 USDT deposits
   */
  async scanTRC20Deposits(): Promise<PendingDeposit[]> {
    const deposits: PendingDeposit[] = [];

    try {
      // Get all active TRC20 deposit addresses
      const activeAddresses = await this.depositAddressRepo.find({
        where: { network: 'TRC20', isActive: true },
      });

      if (activeAddresses.length === 0) {
        return deposits;
      }

      // For each address, check for recent transactions
      for (const addr of activeAddresses) {
        try {
          // Get TRC20 transactions via API
          const trc20Transactions = await this.getTRC20Transactions(addr.address);

          for (const tx of trc20Transactions) {
            // Check if already processed
            const existing = await this.depositOrderRepo.findOne({
              where: { txHash: tx.txHash, network: 'TRC20' },
            });

            if (!existing && tx.toAddress.toLowerCase() === addr.address.toLowerCase()) {
              deposits.push({
                userId: addr.userId,
                address: addr.address,
                network: 'TRC20',
                txHash: tx.txHash,
                fromAddress: tx.fromAddress,
                amount: tx.amount,
                blockNumber: tx.blockNumber,
              });
            }
          }
        } catch (error) {
          this.logger.warn(`Error checking TRC20 address ${addr.address}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error scanning TRC20 deposits:', error);
    }

    return deposits;
  }

  /**
   * Get TRC20 transactions for an address
   */
  private async getTRC20Transactions(
    address: string,
  ): Promise<
    Array<{
      txHash: string;
      fromAddress: string;
      toAddress: string;
      amount: number;
      blockNumber: number;
    }>
  > {
    const transactions: Array<{
      txHash: string;
      fromAddress: string;
      toAddress: string;
      amount: number;
      blockNumber: number;
    }> = [];

    try {
      // Use TronGrid API to get TRC20 transfers
      const apiUrl = this.tronApiUrl;
      const response = await fetch(
        `${apiUrl}/v1/accounts/${address}/transactions/trc20?limit=50&contract_address=${this.usdtContractTrc20}`,
      );

      if (response.ok) {
        const data = await response.json();

        for (const tx of data.data || []) {
          if (tx.to === address && tx.token_info?.symbol === 'USDT') {
            transactions.push({
              txHash: tx.transaction_id,
              fromAddress: tx.from,
              toAddress: tx.to,
              amount: Number(tx.value) / 1e6, // USDT TRC20 has 6 decimals
              blockNumber: tx.block_timestamp,
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Error fetching TRC20 transactions for ${address}:`, error);
    }

    return transactions;
  }

  /**
   * Get current confirmations for a transaction
   */
  async getConfirmations(
    network: NetworkType,
    txHash: string,
    blockNumber: number,
  ): Promise<number> {
    try {
      let currentBlock: number;

      if (network === 'ERC20') {
        currentBlock = await this.ethProvider.getBlockNumber();
      } else if (network === 'BEP20') {
        currentBlock = await this.bscProvider.getBlockNumber();
      } else {
        // TRC20 - get current block via API
        const apiUrl = this.tronApiUrl;
        const response = await fetch(`${apiUrl}/wallet/getnowblock`);
        if (response.ok) {
          const data = await response.json();
          currentBlock = data.block_header?.raw_data?.number || 0;
        } else {
          return 0;
        }
      }

      return Math.max(0, currentBlock - blockNumber);
    } catch (error) {
      this.logger.error(`Error getting confirmations for ${txHash}:`, error);
      return 0;
    }
  }

  /**
   * Check if a transaction has enough confirmations
   */
  async isConfirmed(
    network: NetworkType,
    txHash: string,
    blockNumber: number,
  ): Promise<boolean> {
    const confirmations = await this.getConfirmations(network, txHash, blockNumber);
    return confirmations >= this.CONFIRMATIONS[network];
  }

  /**
   * Get required confirmations for a network
   */
  getRequiredConfirmations(network: NetworkType): number {
    return this.CONFIRMATIONS[network];
  }

  /**
   * Get USDT balance for an address
   */
  async getUsdtBalance(address: string, network: NetworkType): Promise<number> {
    try {
      if (network === 'ERC20') {
        const balance = await this.usdtContractEth.balanceOf(address);
        return Number(ethers.formatUnits(balance, 6));
      } else if (network === 'BEP20') {
        const balance = await this.usdtContractBsc.balanceOf(address);
        return Number(ethers.formatUnits(balance, 6));
      } else {
        // TRC20 - use API to get balance
        const apiUrl = this.tronApiUrl;
        const response = await fetch(
          `${apiUrl}/v1/accounts/${address}/tokens?only_whitelisted=true`,
        );
        if (response.ok) {
          const data = await response.json();
          const usdtToken = data.data?.find(
            (t: { tokenAbbr?: string; tokenId?: string }) =>
              t.tokenAbbr === 'USDT' || t.tokenId === this.usdtContractTrc20,
          );
          return usdtToken ? Number(usdtToken.balance) / 1e6 : 0;
        }
        return 0;
      }
    } catch (error) {
      this.logger.error(`Error getting USDT balance for ${address}:`, error);
      return 0;
    }
  }
}
