import { Controller, Get, Post, Query, Param, Body, UseGuards, RawBodyRequest, Req, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@database/entities/user.entity';
import { DepositService } from './deposit.service';
import { DepositLimitService } from './deposit-limit.service';
import { StripeService } from '@services/payment/stripe.service';
import { PayPalService } from '@services/payment/paypal.service';
import { PaginationQueryDto } from '@common/dto/api-response.dto';
import { DepositMethod, DepositStatus } from '@database/entities/deposit-order.entity';

class CreateCardDepositDto {
  amount: number;
  email?: string;
}

class CreatePayPalDepositDto {
  amount: number;
}

class CapturePayPalOrderDto {
  paypalOrderId: string;
}

@Controller('deposit')
@ApiTags('充值')
export class DepositController {
  constructor(
    private readonly depositService: DepositService,
    private readonly depositLimitService: DepositLimitService,
    private readonly stripeService: StripeService,
    private readonly paypalService: PayPalService,
  ) {}

  @Get('limits')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户充值限额' })
  @ApiQuery({ name: 'method', required: true, enum: ['CRYPTO', 'CARD', 'PAYPAL'] })
  @ApiQuery({ name: 'network', required: false, enum: ['TRC20', 'ERC20', 'BEP20'] })
  async getLimits(
    @CurrentUser() user: User,
    @Query('method') method: DepositMethod,
    @Query('network') network?: string,
  ) {
    return this.depositLimitService.getUserLimits(user.id, method, network);
  }

  @Get('methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取充值方式列表' })
  async getMethods(@CurrentUser() user: User) {
    return this.depositService.getDepositMethods(user.id);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取充值订单列表' })
  @ApiQuery({ name: 'method', required: false, enum: ['CRYPTO', 'CARD', 'PAYPAL'] })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'],
  })
  async getOrders(
    @CurrentUser() user: User,
    @Query() query: PaginationQueryDto,
    @Query('method') method?: DepositMethod,
    @Query('status') status?: DepositStatus,
  ) {
    return this.depositService.getOrders(user.id, { ...query, method, status });
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取充值订单详情' })
  async getOrderDetail(@CurrentUser() user: User, @Param('id') id: string) {
    return this.depositService.getOrderDetail(user.id, id);
  }

  @Post('orders/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消充值订单' })
  async cancelOrder(@CurrentUser() user: User, @Param('id') id: string) {
    const order = await this.depositService.cancelOrder(user.id, id);
    return {
      orderId: order.id,
      orderNo: order.orderNo,
      status: order.status,
    };
  }

  @Post('card/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建银行卡充值订单' })
  @ApiBody({ type: CreateCardDepositDto })
  async createCardDeposit(
    @CurrentUser() user: User,
    @Body() body: CreateCardDepositDto,
  ) {
    const result = await this.depositService.createCardDeposit(
      user.id,
      body.amount,
      body.email || user.email,
    );

    return {
      orderId: result.order.id,
      orderNo: result.order.orderNo,
      clientSecret: result.clientSecret,
      amount: result.order.amount,
      fee: result.order.fee,
      netAmount: result.order.netAmount,
    };
  }

  @Get('card/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取银行卡充值订单详情' })
  async getCardDeposit(@CurrentUser() user: User, @Param('id') id: string) {
    return this.depositService.getOrderDetail(user.id, id);
  }

  @Post('paypal/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建 PayPal 充值订单' })
  @ApiBody({ type: CreatePayPalDepositDto })
  async createPayPalDeposit(
    @CurrentUser() user: User,
    @Body() body: CreatePayPalDepositDto,
  ) {
    const result = await this.depositService.createPayPalDeposit(user.id, body.amount);

    return {
      orderId: result.order.id,
      orderNo: result.order.orderNo,
      paypalOrderId: result.order.paypalOrderId,
      approvalUrl: result.approvalUrl,
      amount: result.order.amount,
      fee: result.order.fee,
      netAmount: result.order.netAmount,
    };
  }

  @Post('paypal/capture')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '确认 PayPal 充值订单' })
  @ApiBody({ type: CapturePayPalOrderDto })
  async capturePayPalOrder(
    @CurrentUser() user: User,
    @Body() body: CapturePayPalOrderDto,
  ) {
    const order = await this.depositService.capturePayPalOrder(user.id, body.paypalOrderId);

    return {
      orderId: order.id,
      orderNo: order.orderNo,
      status: order.status,
      amount: order.amount,
      fee: order.fee,
      netAmount: order.netAmount,
    };
  }

  @Get('paypal/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取 PayPal 充值订单详情' })
  async getPayPalDeposit(@CurrentUser() user: User, @Param('id') id: string) {
    return this.depositService.getOrderDetail(user.id, id);
  }
}

/**
 * Webhook Controller (separate for raw body handling)
 */
@Controller('webhook')
@ApiTags('Webhook')
export class WebhookController {
  constructor(
    private readonly depositService: DepositService,
    private readonly stripeService: StripeService,
    private readonly paypalService: PayPalService,
  ) {}

  @Post('stripe')
  @ApiOperation({ summary: 'Stripe Webhook 回调' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) {
      return { received: false, error: 'No raw body' };
    }

    try {
      const event = this.stripeService.constructWebhookEvent(
        req.rawBody,
        signature,
      );

      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;
          await this.depositService.handleStripePaymentSuccess(paymentIntent.id);
          break;
        }
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object;
          const failureMessage = paymentIntent.last_payment_error?.message;
          await this.depositService.handleStripePaymentFailure(
            paymentIntent.id,
            failureMessage,
          );
          break;
        }
        default:
          // Ignore other event types
          break;
      }

      return { received: true };
    } catch (error) {
      return { received: false, error: (error as Error).message };
    }
  }

  @Post('paypal')
  @ApiOperation({ summary: 'PayPal Webhook 回调' })
  async handlePayPalWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ) {
    if (!req.rawBody) {
      return { received: false, error: 'No raw body' };
    }

    try {
      const webhookId = headers['paypal-transmission-id'];
      const body = req.rawBody.toString();

      // Verify webhook signature
      const isValid = await this.paypalService.verifyWebhookSignature(
        webhookId || '',
        headers,
        body,
      );

      if (!isValid) {
        return { received: false, error: 'Invalid signature' };
      }

      const event = JSON.parse(body);

      const resourceId = event.resource?.id || '';
      const resource = event.resource || {};

      switch (event.event_type) {
        case 'CHECKOUT.ORDER.APPROVED':
        case 'PAYMENT.CAPTURE.COMPLETED':
        case 'PAYMENT.CAPTURE.DENIED':
        case 'PAYMENT.CAPTURE.REFUNDED': {
          await this.depositService.handlePayPalWebhook(
            event.event_type,
            resourceId,
            resource,
          );
          break;
        }
        default:
          // Ignore other event types
          break;
      }

      return { received: true };
    } catch (error) {
      return { received: false, error: (error as Error).message };
    }
  }
}
