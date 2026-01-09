import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ethers } from 'ethers';
import { DepositAddress } from '@database/entities/deposit-address.entity';
import { HdWalletService } from './hd-wallet.service';

interface SweepResult {
  address: string;
  network: 'ERC20' | 'BEP20' | 'TRC20';
  amount: number;
  txHash: string;
  success: boolean;
  error?: string;
}

interface SweepConfig {
  minAmount: number;
  gasLimit: number;
  maxGasPrice: bigint;
}

@Injectable()
export class SweepService implements OnModuleInit {
  private readonly logger = new Logger(SweepService.name);

  private ethProvider: ethers.JsonRpcProvider | null = null;
  private bscProvider: ethers.JsonRpcProvider | null = null;

  // Hot wallet addresses for receiving swept funds
  private hotWalletEth: string = '';
  private hotWalletBsc: string = '';
  private hotWalletTron: string = '';

  // USDT contract addresses
  private usdtContractEth: string = '';
  private usdtContractBsc: string = '';
  private usdtContractTrc20: string = '';

  // ERC20 ABI for transfer
  private readonly erc20Abi = [
    'function balanceOf(address owner) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)',
  ];

  // Sweep configuration per network
  private readonly sweepConfig: Record<string, SweepConfig> = {
    ERC20: {
      minAmount: 50, // Minimum $50 to sweep (due to high gas)
      gasLimit: 100000,
      maxGasPrice: ethers.parseUnits('50', 'gwei'), // Max 50 gwei
    },
    BEP20: {
      minAmount: 10, // Minimum $10 to sweep
      gasLimit: 100000,
      maxGasPrice: ethers.parseUnits('10', 'gwei'), // Max 10 gwei
    },
    TRC20: {
      minAmount: 10, // Minimum $10 to sweep
      gasLimit: 50000,
      maxGasPrice: BigInt(1000), // TRX bandwidth/energy
    },
  };

  constructor(
    private configService: ConfigService,
    @InjectRepository(DepositAddress)
    private depositAddressRepo: Repository<DepositAddress>,
    private hdWalletService: HdWalletService,
    private dataSource: DataSource,
  ) {}

  async onModuleInit() {
    // Initialize providers
    const ethRpcUrl = this.configService.get<string>('ETH_RPC_URL');
    const bscRpcUrl = this.configService.get<string>('BSC_RPC_URL');

    if (ethRpcUrl) {
      this.ethProvider = new ethers.JsonRpcProvider(ethRpcUrl);
      this.logger.log('Sweep Service: ETH provider initialized');
    }

    if (bscRpcUrl) {
      this.bscProvider = new ethers.JsonRpcProvider(bscRpcUrl);
      this.logger.log('Sweep Service: BSC provider initialized');
    }

    // Load hot wallet addresses
    this.hotWalletEth = this.configService.get<string>('HOT_WALLET_ETH') || '';
    this.hotWalletBsc = this.configService.get<string>('HOT_WALLET_BSC') || '';
    this.hotWalletTron = this.configService.get<string>('HOT_WALLET_TRON') || '';

    // Load USDT contract addresses
    this.usdtContractEth = this.configService.get<string>('USDT_CONTRACT_ETH') || '';
    this.usdtContractBsc = this.configService.get<string>('USDT_CONTRACT_BSC') || '';
    this.usdtContractTrc20 = this.configService.get<string>('USDT_CONTRACT_TRC20') || '';

    this.logger.log('Sweep Service initialized');
  }

  /**
   * Check if sweep service is enabled for a network
   */
  isEnabled(network: 'ERC20' | 'BEP20' | 'TRC20'): boolean {
    switch (network) {
      case 'ERC20':
        return !!this.ethProvider && !!this.hotWalletEth && !!this.usdtContractEth;
      case 'BEP20':
        return !!this.bscProvider && !!this.hotWalletBsc && !!this.usdtContractBsc;
      case 'TRC20':
        return !!this.hotWalletTron && !!this.usdtContractTrc20;
      default:
        return false;
    }
  }

  /**
   * Get addresses that need sweeping (balance above threshold)
   */
  async getAddressesForSweep(network: 'ERC20' | 'BEP20' | 'TRC20'): Promise<DepositAddress[]> {
    const config = this.sweepConfig[network];

    // Get all active deposit addresses for the network
    const addresses = await this.depositAddressRepo.find({
      where: { network, isActive: true },
    });

    const addressesForSweep: DepositAddress[] = [];

    for (const addr of addresses) {
      const balance = await this.getUSDTBalance(network, addr.address);
      if (balance >= config.minAmount) {
        addressesForSweep.push(addr);
      }
    }

    return addressesForSweep;
  }

  /**
   * Get USDT balance for an address
   */
  async getUSDTBalance(network: 'ERC20' | 'BEP20' | 'TRC20', address: string): Promise<number> {
    try {
      if (network === 'ERC20' && this.ethProvider) {
        const contract = new ethers.Contract(this.usdtContractEth, this.erc20Abi, this.ethProvider);
        const balance = await contract.balanceOf(address);
        const decimals = await contract.decimals();
        return Number(ethers.formatUnits(balance, decimals));
      }

      if (network === 'BEP20' && this.bscProvider) {
        const contract = new ethers.Contract(this.usdtContractBsc, this.erc20Abi, this.bscProvider);
        const balance = await contract.balanceOf(address);
        const decimals = await contract.decimals();
        return Number(ethers.formatUnits(balance, decimals));
      }

      if (network === 'TRC20') {
        return await this.getTRC20Balance(address);
      }

      return 0;
    } catch (error) {
      this.logger.error(`Failed to get USDT balance for ${address} on ${network}`, error);
      return 0;
    }
  }

  /**
   * Get TRC20 USDT balance via TronGrid API
   */
  private async getTRC20Balance(address: string): Promise<number> {
    const tronApiUrl = this.configService.get<string>('TRON_API_URL') || 'https://api.trongrid.io';

    const response = await fetch(
      `${tronApiUrl}/v1/accounts/${address}/tokens?token=${this.usdtContractTrc20}`,
    );

    if (!response.ok) return 0;

    const data = await response.json();
    const token = data.data?.find(
      (t: { token_id: string; balance: string }) => t.token_id === this.usdtContractTrc20,
    );

    if (!token) return 0;

    // USDT TRC20 has 6 decimals
    return Number(token.balance) / 1e6;
  }

  /**
   * Sweep funds from a single address to hot wallet
   */
  async sweepAddress(depositAddress: DepositAddress): Promise<SweepResult> {
    const { network, address, derivationIndex } = depositAddress;

    const result: SweepResult = {
      address,
      network,
      amount: 0,
      txHash: '',
      success: false,
    };

    try {
      if (!this.isEnabled(network)) {
        result.error = `Sweep not enabled for ${network}`;
        return result;
      }

      const balance = await this.getUSDTBalance(network, address);
      const config = this.sweepConfig[network];

      if (balance < config.minAmount) {
        result.error = `Balance ${balance} below minimum ${config.minAmount}`;
        return result;
      }

      result.amount = balance;

      // Get the private key for the address
      const privateKey = await this.hdWalletService.getPrivateKey(network, derivationIndex);
      if (!privateKey) {
        result.error = 'Failed to derive private key';
        return result;
      }

      // Execute the sweep
      if (network === 'TRC20') {
        result.txHash = await this.sweepTRC20(address, privateKey, balance);
      } else {
        const provider = network === 'ERC20' ? this.ethProvider : this.bscProvider;
        const hotWallet = network === 'ERC20' ? this.hotWalletEth : this.hotWalletBsc;
        const contractAddress = network === 'ERC20' ? this.usdtContractEth : this.usdtContractBsc;

        if (!provider) {
          result.error = `Provider not available for ${network}`;
          return result;
        }

        result.txHash = await this.sweepERC20(
          provider,
          privateKey,
          contractAddress,
          hotWallet,
          balance,
          config,
        );
      }

      result.success = true;

      // Update deposit address sweep stats
      depositAddress.lastSweptAt = new Date();
      depositAddress.totalSwept = Number(depositAddress.totalSwept || 0) + balance;
      await this.depositAddressRepo.save(depositAddress);

      this.logger.log(`Swept ${balance} USDT from ${address} to hot wallet: ${result.txHash}`);

      return result;
    } catch (error) {
      result.error = (error as Error).message;
      this.logger.error(`Failed to sweep ${address}`, error);
      return result;
    }
  }

  /**
   * Sweep ERC20/BEP20 USDT
   */
  private async sweepERC20(
    provider: ethers.JsonRpcProvider,
    privateKey: string,
    contractAddress: string,
    hotWallet: string,
    amount: number,
    config: SweepConfig,
  ): Promise<string> {
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, this.erc20Abi, wallet);

    const decimals = await contract.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    // Check gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);

    if (gasPrice > config.maxGasPrice) {
      throw new Error(`Gas price ${gasPrice} exceeds max ${config.maxGasPrice}`);
    }

    // Execute transfer
    const tx = await contract.transfer(hotWallet, amountWei, {
      gasLimit: config.gasLimit,
      gasPrice,
    });

    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Sweep TRC20 USDT (via TronGrid API)
   */
  private async sweepTRC20(
    fromAddress: string,
    privateKey: string,
    amount: number,
  ): Promise<string> {
    const tronApiUrl = this.configService.get<string>('TRON_API_URL') || 'https://api.trongrid.io';
    const tronApiKey = this.configService.get<string>('TRON_API_KEY') || '';

    // Convert amount to sun (6 decimals for USDT)
    const amountSun = Math.floor(amount * 1e6);

    // Build TriggerSmartContract transaction
    const response = await fetch(
      `${tronApiUrl}/wallet/triggersmartcontract`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tronApiKey ? { 'TRON-PRO-API-KEY': tronApiKey } : {}),
        },
        body: JSON.stringify({
          owner_address: this.hexEncode(fromAddress),
          contract_address: this.hexEncode(this.usdtContractTrc20),
          function_selector: 'transfer(address,uint256)',
          parameter: this.encodeTransferParams(this.hotWalletTron, amountSun),
          fee_limit: 100000000, // 100 TRX max
          call_value: 0,
        }),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to create TRC20 transfer transaction');
    }

    const data = await response.json();

    if (!data.transaction) {
      throw new Error(data.result?.message || 'Failed to create transaction');
    }

    // Sign the transaction
    const signedTx = await this.signTronTransaction(data.transaction, privateKey);

    // Broadcast transaction
    const broadcastResponse = await fetch(
      `${tronApiUrl}/wallet/broadcasttransaction`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tronApiKey ? { 'TRON-PRO-API-KEY': tronApiKey } : {}),
        },
        body: JSON.stringify(signedTx),
      },
    );

    const broadcastData = await broadcastResponse.json();

    if (!broadcastData.result) {
      throw new Error(broadcastData.message || 'Failed to broadcast transaction');
    }

    return signedTx.txID as string;
  }

  /**
   * Convert TRON address to hex format
   */
  private hexEncode(address: string): string {
    // If already hex, return as is
    if (address.startsWith('41')) return address;

    // Convert base58 to hex (simplified - would need full implementation)
    // For now, this is a placeholder
    return address;
  }

  /**
   * Encode TRC20 transfer parameters
   */
  private encodeTransferParams(toAddress: string, amount: number): string {
    // Encode address (32 bytes, padded)
    const addressHex = this.hexEncode(toAddress).replace('41', '').padStart(64, '0');

    // Encode amount (32 bytes)
    const amountHex = amount.toString(16).padStart(64, '0');

    return addressHex + amountHex;
  }

  /**
   * Sign TRON transaction (simplified implementation)
   */
  private async signTronTransaction(
    transaction: Record<string, unknown>,
    privateKey: string,
  ): Promise<Record<string, unknown>> {
    // This is a simplified implementation
    // In production, use proper TRON signing library
    const txID = transaction.txID as string;

    // Use ethers to sign (TRON uses same secp256k1 curve)
    const signingKey = new ethers.SigningKey('0x' + privateKey);
    const signature = signingKey.sign(txID);

    return {
      ...transaction,
      signature: [signature.r.slice(2) + signature.s.slice(2) + (signature.v === 27 ? '1b' : '1c')],
    };
  }

  /**
   * Sweep all addresses for a network
   */
  async sweepNetwork(network: 'ERC20' | 'BEP20' | 'TRC20'): Promise<SweepResult[]> {
    const results: SweepResult[] = [];

    if (!this.isEnabled(network)) {
      this.logger.warn(`Sweep not enabled for ${network}`);
      return results;
    }

    const addresses = await this.getAddressesForSweep(network);

    this.logger.log(`Found ${addresses.length} addresses to sweep on ${network}`);

    for (const addr of addresses) {
      const result = await this.sweepAddress(addr);
      results.push(result);

      // Small delay between sweeps to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const successCount = results.filter((r) => r.success).length;
    const totalAmount = results.filter((r) => r.success).reduce((sum, r) => sum + r.amount, 0);

    this.logger.log(
      `Sweep completed for ${network}: ${successCount}/${addresses.length} addresses, ${totalAmount} USDT total`,
    );

    return results;
  }

  /**
   * Sweep all networks
   */
  async sweepAll(): Promise<Record<string, SweepResult[]>> {
    const results: Record<string, SweepResult[]> = {};

    for (const network of ['ERC20', 'BEP20', 'TRC20'] as const) {
      results[network] = await this.sweepNetwork(network);
    }

    return results;
  }

  /**
   * Get sweep status and statistics
   */
  async getSweepStats(): Promise<{
    totalAddresses: number;
    addressesNeedingSweep: number;
    pendingAmount: number;
    totalSwept: number;
  }> {
    const allAddresses = await this.depositAddressRepo.find({
      where: { isActive: true },
    });

    let addressesNeedingSweep = 0;
    let pendingAmount = 0;
    let totalSwept = 0;

    for (const addr of allAddresses) {
      const balance = await this.getUSDTBalance(addr.network, addr.address);
      const config = this.sweepConfig[addr.network];

      if (balance >= config.minAmount) {
        addressesNeedingSweep++;
        pendingAmount += balance;
      }

      totalSwept += Number(addr.totalSwept || 0);
    }

    return {
      totalAddresses: allAddresses.length,
      addressesNeedingSweep,
      pendingAmount,
      totalSwept,
    };
  }
}
