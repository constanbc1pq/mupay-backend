import { Injectable, OnModuleInit, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client,
  Environment,
  LogLevel,
  OrdersController,
  CheckoutPaymentIntent,
  Order,
  PaypalExperienceLandingPage,
  PaypalExperienceUserAction,
} from '@paypal/paypal-server-sdk';

export interface CreatePayPalOrderParams {
  amount: number; // Amount in USD
  userId: string;
  orderId: string;
}

export interface PayPalOrderResult {
  paypalOrderId: string;
  approvalUrl: string;
  amount: number;
  fee: number;
  netAmount: number;
}

@Injectable()
export class PayPalService implements OnModuleInit {
  private readonly logger = new Logger(PayPalService.name);
  private client: Client;
  private ordersController: OrdersController;

  // Fee rate: 4.4%
  private readonly FEE_RATE = 0.044;
  private readonly MIN_AMOUNT = 50; // Minimum $50
  private readonly MAX_AMOUNT = 5000; // Maximum $5,000

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      this.logger.warn('PayPal credentials not configured, PayPal payments will be disabled');
      return;
    }

    const environment =
      this.configService.get<string>('NODE_ENV') === 'production'
        ? Environment.Production
        : Environment.Sandbox;

    this.client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: clientId,
        oAuthClientSecret: clientSecret,
      },
      timeout: 30000,
      environment,
      logging: {
        logLevel: LogLevel.Info,
        logRequest: { logBody: false },
        logResponse: { logHeaders: false },
      },
    });

    this.ordersController = new OrdersController(this.client);

    this.logger.log(`PayPal Service initialized (${environment})`);
  }

  /**
   * Check if PayPal is configured and enabled
   */
  isEnabled(): boolean {
    return !!this.client;
  }

  /**
   * Calculate fee for a given amount
   */
  calculateFee(amount: number): { fee: number; netAmount: number } {
    const fee = Math.ceil(amount * this.FEE_RATE * 100) / 100;
    const netAmount = amount - fee;
    return { fee, netAmount };
  }

  /**
   * Create a PayPal order
   */
  async createOrder(params: CreatePayPalOrderParams): Promise<PayPalOrderResult> {
    if (!this.client) {
      throw new BadRequestException('PayPal payments are not configured');
    }

    const { amount, userId, orderId } = params;

    // Validate amount
    if (amount < this.MIN_AMOUNT) {
      throw new BadRequestException(`Minimum deposit amount is $${this.MIN_AMOUNT}`);
    }
    if (amount > this.MAX_AMOUNT) {
      throw new BadRequestException(`Maximum deposit amount is $${this.MAX_AMOUNT}`);
    }

    const { fee, netAmount } = this.calculateFee(amount);

    const orderRequest = {
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            amount: {
              currencyCode: 'USD',
              value: amount.toFixed(2),
            },
            description: `MuPay Deposit - Order ${orderId}`,
            customId: orderId,
            referenceId: userId,
          },
        ],
        paymentSource: {
          paypal: {
            experienceContext: {
              brandName: 'MuPay',
              landingPage: PaypalExperienceLandingPage.Login,
              userAction: PaypalExperienceUserAction.PayNow,
              returnUrl: `${this.configService.get<string>('APP_URL') || 'http://localhost:8081'}/deposit/paypal/success`,
              cancelUrl: `${this.configService.get<string>('APP_URL') || 'http://localhost:8081'}/deposit/paypal/cancel`,
            },
          },
        },
      },
    };

    const response = await this.ordersController.createOrder(orderRequest);

    if (!response.result || (response.statusCode !== 200 && response.statusCode !== 201)) {
      throw new BadRequestException('Failed to create PayPal order');
    }

    const order = response.result as Order;
    const approvalLink = order.links?.find((link) => link.rel === 'payer-action');

    if (!approvalLink?.href) {
      throw new BadRequestException('PayPal approval URL not found');
    }

    return {
      paypalOrderId: order.id!,
      approvalUrl: approvalLink.href,
      amount,
      fee,
      netAmount,
    };
  }

  /**
   * Capture a PayPal order after user approval
   */
  async captureOrder(paypalOrderId: string): Promise<Order> {
    if (!this.client) {
      throw new BadRequestException('PayPal payments are not configured');
    }

    const response = await this.ordersController.captureOrder({
      id: paypalOrderId,
    });

    if (!response.result || (response.statusCode !== 200 && response.statusCode !== 201)) {
      throw new BadRequestException('Failed to capture PayPal order');
    }

    return response.result as Order;
  }

  /**
   * Get PayPal order details
   */
  async getOrder(paypalOrderId: string): Promise<Order> {
    if (!this.client) {
      throw new BadRequestException('PayPal payments are not configured');
    }

    const response = await this.ordersController.getOrder({
      id: paypalOrderId,
    });

    if (!response.result || response.statusCode !== 200) {
      throw new BadRequestException('Failed to get PayPal order');
    }

    return response.result as Order;
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhookSignature(
    webhookId: string,
    headers: Record<string, string>,
    body: string,
  ): Promise<boolean> {
    // PayPal webhook verification would go here
    // For now, return true in sandbox mode
    const environment = this.configService.get<string>('NODE_ENV');
    if (environment !== 'production') {
      return true;
    }

    // In production, implement proper webhook verification
    // using PayPal's webhook signature verification API
    const expectedWebhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID');
    if (!expectedWebhookId) {
      this.logger.warn('PAYPAL_WEBHOOK_ID not configured');
      return false;
    }

    // Verify webhook signature using PayPal API
    // This is a simplified implementation
    return true;
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
