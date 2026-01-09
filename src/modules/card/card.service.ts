import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Card, CardType, CardLevel, CardStatus } from '@database/entities/card.entity';
import { CardRecharge, CardRechargeStatus } from '@database/entities/card-recharge.entity';
import { MSG } from '@common/constants/messages';
import { UserService } from '../user/user.service';
import { WalletService } from '../wallet/wallet.service';
import { ApplyCardDto } from './dto/apply-card.dto';
import { RechargeCardDto } from './dto/recharge-card.dto';
import { UpgradeCardDto } from './dto/upgrade-card.dto';

@Injectable()
export class CardService {
  private readonly CARD_TYPES: Record<string, {
    name: string;
    description: string;
    openFee: number;
    monthlyFee: number;
    minDeposit: number;
    rechargeRate: number;
  }> = {
    enjoy: {
      name: '畅享卡',
      description: '仅限中国大陆使用',
      openFee: 10,
      monthlyFee: 2,
      minDeposit: 20,
      rechargeRate: 0.018,
    },
    universal: {
      name: '全能卡',
      description: '全球可用',
      openFee: 10,
      monthlyFee: 2,
      minDeposit: 50,
      rechargeRate: 0.018,
    },
  };

  private readonly CARD_LEVELS: Record<string, { monthlyLimit: number; upgradeFee: number }> = {
    regular: { monthlyLimit: 5000, upgradeFee: 0 },
    silver: { monthlyLimit: 20000, upgradeFee: 50 },
    gold: { monthlyLimit: 100000, upgradeFee: 100 },
  };

  constructor(
    @InjectRepository(Card)
    private cardRepository: Repository<Card>,
    @InjectRepository(CardRecharge)
    private cardRechargeRepository: Repository<CardRecharge>,
    private userService: UserService,
    private walletService: WalletService,
  ) {}

  async getCards(userId: string) {
    const cards = await this.cardRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return cards.map((card) => ({
      ...card,
      cardNumber: this.maskCardNumber(this.decrypt(card.cardNumber)),
      cvv: '***',
    }));
  }

  async getCardTypes() {
    return {
      types: this.CARD_TYPES,
      levels: this.CARD_LEVELS,
    };
  }

  async applyCard(userId: string, dto: ApplyCardDto) {
    const cardType = this.CARD_TYPES[dto.type];
    if (!cardType) {
      throw new BadRequestException(MSG.CARD_TYPE_INVALID);
    }

    const totalCost = cardType.openFee + cardType.minDeposit;

    // Check wallet balance
    const wallet = await this.walletService.getWalletByUserId(userId);
    if (Number(wallet.balance) < totalCost) {
      throw new BadRequestException(MSG.WALLET_BALANCE_INSUFFICIENT);
    }

    // Deduct balance
    await this.walletService.updateBalance(userId, -totalCost);

    // Generate card
    const cardNumber = this.generateCardNumber();
    const expiryDate = this.generateExpiryDate();
    const cvv = this.generateCvv();

    const card = this.cardRepository.create({
      userId,
      type: dto.type as CardType,
      level: CardLevel.REGULAR,
      cardNumber: this.encrypt(cardNumber),
      expiryDate,
      cvv: this.encrypt(cvv),
      balance: cardType.minDeposit,
      monthlyLimit: this.CARD_LEVELS.regular.monthlyLimit,
      monthlyUsed: 0,
      status: CardStatus.ACTIVE,
      bindings: [],
    });

    await this.cardRepository.save(card);

    return {
      messageId: MSG.CARD_APPLY_SUCCESS,
      card: {
        id: card.id,
        type: card.type,
        cardNumber: this.maskCardNumber(cardNumber),
        expiryDate: card.expiryDate,
        balance: card.balance,
      },
    };
  }

  async getCardDetail(userId: string, cardId: string) {
    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
    });

    if (!card) {
      throw new NotFoundException(MSG.CARD_NOT_FOUND);
    }

    return {
      ...card,
      cardNumber: this.maskCardNumber(this.decrypt(card.cardNumber)),
      cvv: '***',
    };
  }

  async getCvv(userId: string, cardId: string, paymentPassword: string) {
    // Verify payment password
    await this.userService.verifyPaymentPassword(userId, paymentPassword);

    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
    });

    if (!card) {
      throw new NotFoundException(MSG.CARD_NOT_FOUND);
    }

    return {
      cvv: this.decrypt(card.cvv),
      fullCardNumber: this.decrypt(card.cardNumber),
      expiresIn: 30, // seconds
    };
  }

  async rechargeCard(userId: string, cardId: string, dto: RechargeCardDto) {
    // Verify payment password
    await this.userService.verifyPaymentPassword(userId, dto.paymentPassword);

    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
    });

    if (!card) {
      throw new NotFoundException(MSG.CARD_NOT_FOUND);
    }

    if (card.status !== CardStatus.ACTIVE) {
      throw new BadRequestException(MSG.CARD_STATUS_ABNORMAL);
    }

    const fee = dto.amount * this.CARD_TYPES[card.type].rechargeRate;
    const totalCost = dto.amount + fee;

    // Check wallet balance
    const wallet = await this.walletService.getWalletByUserId(userId);
    if (Number(wallet.balance) < totalCost) {
      throw new BadRequestException(MSG.WALLET_BALANCE_INSUFFICIENT);
    }

    // Deduct from wallet
    await this.walletService.updateBalance(userId, -totalCost);

    // Add to card balance
    card.balance = Number(card.balance) + dto.amount;
    await this.cardRepository.save(card);

    // Create recharge record
    const recharge = this.cardRechargeRepository.create({
      userId,
      cardId,
      amount: dto.amount,
      fee,
      status: CardRechargeStatus.COMPLETED,
      completedAt: new Date(),
    });
    await this.cardRechargeRepository.save(recharge);

    return {
      messageId: MSG.CARD_RECHARGE_SUCCESS,
      cardBalance: card.balance,
    };
  }

  async freezeCard(userId: string, cardId: string) {
    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
    });

    if (!card) {
      throw new NotFoundException(MSG.CARD_NOT_FOUND);
    }

    card.status = CardStatus.FROZEN;
    await this.cardRepository.save(card);

    return { messageId: MSG.CARD_FROZEN };
  }

  async unfreezeCard(userId: string, cardId: string) {
    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
    });

    if (!card) {
      throw new NotFoundException(MSG.CARD_NOT_FOUND);
    }

    card.status = CardStatus.ACTIVE;
    await this.cardRepository.save(card);

    return { messageId: MSG.CARD_UNFROZEN };
  }

  async upgradeCard(userId: string, cardId: string, dto: UpgradeCardDto) {
    const card = await this.cardRepository.findOne({
      where: { id: cardId, userId },
    });

    if (!card) {
      throw new NotFoundException(MSG.CARD_NOT_FOUND);
    }

    const targetLevel = this.CARD_LEVELS[dto.targetLevel];
    if (!targetLevel) {
      throw new BadRequestException(MSG.CARD_LEVEL_INVALID);
    }

    const upgradeFee = targetLevel.upgradeFee;

    // Check wallet balance
    const wallet = await this.walletService.getWalletByUserId(userId);
    if (Number(wallet.balance) < upgradeFee) {
      throw new BadRequestException(MSG.WALLET_BALANCE_INSUFFICIENT);
    }

    // Deduct fee
    await this.walletService.updateBalance(userId, -upgradeFee);

    // Upgrade card
    card.level = dto.targetLevel as CardLevel;
    card.monthlyLimit = targetLevel.monthlyLimit;
    await this.cardRepository.save(card);

    return { messageId: MSG.CARD_UPGRADE_SUCCESS };
  }

  private generateCardNumber(): string {
    const prefix = '4532'; // Visa prefix
    let number = prefix;
    for (let i = 0; i < 12; i++) {
      number += Math.floor(Math.random() * 10);
    }
    return number;
  }

  private generateExpiryDate(): string {
    const now = new Date();
    const expiryYear = now.getFullYear() + 2;
    const expiryMonth = String(now.getMonth() + 1).padStart(2, '0');
    return `${expiryMonth}/${String(expiryYear).slice(-2)}`;
  }

  private generateCvv(): string {
    return String(Math.floor(Math.random() * 900) + 100);
  }

  private maskCardNumber(cardNumber: string): string {
    return `${cardNumber.slice(0, 4)} **** **** ${cardNumber.slice(-4)}`;
  }

  private encrypt(text: string): string {
    // Simple encryption for demo - use proper AES in production
    const key = process.env.ENCRYPTION_KEY || 'mupay-aes-encryption-key-dev-32c';
    const cipher = crypto.createCipheriv('aes-256-ecb', key.slice(0, 32), null);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decrypt(encrypted: string): string {
    const key = process.env.ENCRYPTION_KEY || 'mupay-aes-encryption-key-dev-32c';
    const decipher = crypto.createDecipheriv('aes-256-ecb', key.slice(0, 32), null);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
