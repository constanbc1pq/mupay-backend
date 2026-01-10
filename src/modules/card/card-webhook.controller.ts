import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  Logger,
  BadRequestException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { CardWebhookService } from './card-webhook.service';

/**
 * Webhook 事件类型
 */
export interface WebhookEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  data: Record<string, any>;
}

/**
 * 卡服务商 Webhook 回调处理控制器
 */
@ApiTags('Webhook')
@Controller('webhook/card')
export class CardWebhookController {
  private readonly logger = new Logger(CardWebhookController.name);

  constructor(private readonly webhookService: CardWebhookService) {}

  /**
   * 服务商 Webhook 回调入口
   * POST /api/webhook/card/:provider
   */
  @Post(':provider')
  @ApiOperation({ summary: '服务商 Webhook 回调' })
  @ApiExcludeEndpoint() // 不在 Swagger 文档中显示
  async handleWebhook(
    @Param('provider') provider: string,
    @Body() body: any,
    @Headers('x-signature') signature: string,
    @Headers('x-timestamp') timestamp: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Webhook received from provider: ${provider}`);
    this.logger.debug(`Webhook body: ${JSON.stringify(body)}`);

    try {
      // 验证签名 (使用原始请求体)
      const rawBody = req.rawBody?.toString() || JSON.stringify(body);
      const isValid = await this.webhookService.verifySignature(
        provider,
        rawBody,
        signature,
        timestamp,
      );

      if (!isValid) {
        this.logger.warn(`Invalid webhook signature from ${provider}`);
        throw new BadRequestException('Invalid signature');
      }

      // 处理 Webhook 事件
      await this.webhookService.handleEvent(provider, body);

      return { success: true, message: 'Webhook processed' };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, error.stack);

      if (error instanceof BadRequestException) {
        throw error;
      }

      // 返回成功以避免服务商重试 (记录日志后处理)
      return { success: true, message: 'Webhook received' };
    }
  }

  /**
   * UQPAY 专用 Webhook 入口
   * POST /api/webhook/card/uqpay
   */
  @Post('uqpay')
  @ApiOperation({ summary: 'UQPAY Webhook 回调' })
  @ApiExcludeEndpoint()
  async handleUqpayWebhook(
    @Body() body: any,
    @Headers('x-uqpay-signature') signature: string,
    @Headers('x-uqpay-timestamp') timestamp: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ success: boolean; message: string }> {
    return this.handleWebhook('uqpay', body, signature, timestamp, req);
  }
}
