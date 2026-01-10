import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HDNodeWallet, Mnemonic, sha256, getBytes, hexlify } from 'ethers';

export type NetworkType = 'TRC20' | 'ERC20' | 'BEP20';

interface DerivedAddress {
  address: string;
  network: NetworkType;
  derivationPath: string;
}

// Base58 alphabet for TRON addresses
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

@Injectable()
export class HdWalletService implements OnModuleInit {
  private ethMasterNode: HDNodeWallet;
  private mnemonic: string;

  // BIP44 coin types
  private readonly ETH_COIN_TYPE = 60; // ETH/BNB use same coin type
  private readonly TRON_COIN_TYPE = 195;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const mnemonic = this.configService.get<string>('HD_WALLET_MNEMONIC');
    if (!mnemonic) {
      throw new Error('HD_WALLET_MNEMONIC is not configured');
    }
    this.mnemonic = mnemonic;

    // Initialize ETH/BSC master node
    const mnemonicObj = Mnemonic.fromPhrase(this.mnemonic);
    this.ethMasterNode = HDNodeWallet.fromMnemonic(mnemonicObj);

    console.log('HD Wallet Service initialized');
  }

  /**
   * Convert hex bytes to Base58 string
   */
  private hexToBase58(hexStr: string): string {
    const bytes = getBytes(hexStr);
    let num = BigInt('0x' + hexlify(bytes).slice(2));

    let result = '';
    while (num > 0n) {
      const remainder = Number(num % 58n);
      result = BASE58_ALPHABET[remainder] + result;
      num = num / 58n;
    }

    // Add leading '1's for leading zero bytes
    for (const byte of bytes) {
      if (byte === 0) {
        result = '1' + result;
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Convert ETH address to TRON address
   */
  private ethAddressToTron(ethAddress: string): string {
    // Remove '0x' and add '41' prefix (TRON mainnet prefix)
    const addressHex = '41' + ethAddress.slice(2).toLowerCase();

    // Double SHA256 for checksum (TRON uses SHA256, not keccak256)
    const hash1 = sha256(getBytes('0x' + addressHex));
    const hash2 = sha256(getBytes(hash1));
    const checksum = hash2.slice(2, 10); // First 4 bytes

    // Append checksum
    const addressWithChecksum = addressHex + checksum;

    return this.hexToBase58('0x' + addressWithChecksum);
  }

  /**
   * Derive ERC20/BEP20 address for a given user index
   * BIP44 path: m/44'/60'/0'/0/{index}
   */
  deriveEthAddress(index: number): string {
    if (!this.ethMasterNode) {
      throw new Error('HD Wallet Service not initialized');
    }
    const path = `m/44'/${this.ETH_COIN_TYPE}'/0'/0/${index}`;
    const childNode = this.ethMasterNode.derivePath(path);
    return childNode.address;
  }

  /**
   * Derive TRC20 address for a given user index
   * BIP44 path: m/44'/195'/0'/0/{index}
   */
  async deriveTronAddress(index: number): Promise<string> {
    const path = `m/44'/${this.TRON_COIN_TYPE}'/0'/0/${index}`;
    const mnemonicObj = Mnemonic.fromPhrase(this.mnemonic);
    const hdNode = HDNodeWallet.fromMnemonic(mnemonicObj, path);

    // Convert ETH-style address to TRON address format
    return this.ethAddressToTron(hdNode.address);
  }

  /**
   * Derive all network addresses for a user
   */
  async deriveAllAddresses(index: number): Promise<DerivedAddress[]> {
    const ethAddress = this.deriveEthAddress(index);
    const tronAddress = await this.deriveTronAddress(index);

    return [
      {
        address: tronAddress,
        network: 'TRC20',
        derivationPath: `m/44'/${this.TRON_COIN_TYPE}'/0'/0/${index}`,
      },
      {
        address: ethAddress,
        network: 'ERC20',
        derivationPath: `m/44'/${this.ETH_COIN_TYPE}'/0'/0/${index}`,
      },
      {
        address: ethAddress, // BEP20 uses same address as ERC20
        network: 'BEP20',
        derivationPath: `m/44'/${this.ETH_COIN_TYPE}'/0'/0/${index}`,
      },
    ];
  }

  /**
   * Get private key for a specific network and index (for signing transactions)
   * WARNING: Only use this for fund sweeping operations
   */
  async getPrivateKey(network: NetworkType, index: number): Promise<string> {
    if (network === 'TRC20') {
      const path = `m/44'/${this.TRON_COIN_TYPE}'/0'/0/${index}`;
      const mnemonicObj = Mnemonic.fromPhrase(this.mnemonic);
      const hdNode = HDNodeWallet.fromMnemonic(mnemonicObj, path);
      return hdNode.privateKey.slice(2); // Remove '0x' prefix for TRON
    } else {
      const path = `m/44'/${this.ETH_COIN_TYPE}'/0'/0/${index}`;
      const childNode = this.ethMasterNode.derivePath(path);
      return childNode.privateKey;
    }
  }

  /**
   * Validate that an address matches the expected derivation for a network
   */
  async validateAddress(
    address: string,
    network: NetworkType,
    index: number,
  ): Promise<boolean> {
    const addresses = await this.deriveAllAddresses(index);
    const expected = addresses.find((a) => a.network === network);
    return expected?.address.toLowerCase() === address.toLowerCase();
  }
}
