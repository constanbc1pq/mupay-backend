import { Injectable, OnModuleInit, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface CreatePaymentIntentParams {
  amount: number; // Amount in USDT
  userId: string;
  orderId: string;
  email?: string;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  fee: number;
  netAmount: number;
}

@Injectable()
export class StripeService implements OnModuleInit {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;
  private webhookSecret: string;

  // Fee rate: 3.5%
  private readonly FEE_RATE = 0.035;
  private readonly MIN_AMOUNT = 50; // Minimum $50
  private readonly MAX_AMOUNT = 10000; // Maximum $10,000

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!apiKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured, Stripe payments will be disabled');
      return;
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-12-15.clover',
    });

    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';

    this.logger.log('Stripe Service initialized');
  }

  /**
   * Check if Stripe is configured and enabled
   */
  isEnabled(): boolean {
    return !!this.stripe;
  }

  /**
   * Calculate fee for a given amount
   */
  calculateFee(amount: number): { fee: number; netAmount: number } {
    const fee = Math.ceil(amount * this.FEE_RATE * 100) / 100; // Round up to 2 decimal places
    const netAmount = amount - fee;
    return { fee, netAmount };
  }

  /**
   * Create a PaymentIntent for card deposit
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe payments are not configured');
    }

    const { amount, userId, orderId, email } = params;

    // Validate amount
    if (amount < this.MIN_AMOUNT) {
      throw new BadRequestException(`Minimum deposit amount is $${this.MIN_AMOUNT}`);
    }
    if (amount > this.MAX_AMOUNT) {
      throw new BadRequestException(`Maximum deposit amount is $${this.MAX_AMOUNT}`);
    }

    const { fee, netAmount } = this.calculateFee(amount);

    // Amount in cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId,
        orderId,
        type: 'deposit',
        netAmount: netAmount.toString(),
        fee: fee.toString(),
      },
      receipt_email: email,
      description: `MuPay Deposit - Order ${orderId}`,
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      amount,
      fee,
      netAmount,
    };
  }

  /**
   * Retrieve a PaymentIntent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe payments are not configured');
    }

    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Verify webhook signature and parse event
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    if (!this.stripe) {
      throw new BadRequestException('Stripe payments are not configured');
    }

    if (!this.webhookSecret) {
      throw new BadRequestException('Stripe webhook secret is not configured');
    }

    return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
  }

  /**
   * Get deposit limits based on KYC level
   */
  getDepositLimits(kycLevel: number): { daily: number; monthly: number; perTransaction: number } {
    switch (kycLevel) {
      case 0: // No KYC
        return { daily: 100, monthly: 500, perTransaction: 100 };
      case 1: // Basic KYC
        return { daily: 1000, monthly: 5000, perTransaction: 1000 };
      case 2: // Full KYC
        return { daily: 10000, monthly: 50000, perTransaction: 10000 };
      default:
        return { daily: 100, monthly: 500, perTransaction: 100 };
    }
  }

  /**
   * Get fee configuration
   */
  getFeeConfig() {
    return {
      feeRate: this.FEE_RATE,
      minAmount: this.MIN_AMOUNT,
      maxAmount: this.MAX_AMOUNT,
    };
  }
}
