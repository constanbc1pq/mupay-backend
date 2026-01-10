import { Logger } from '@nestjs/common';
import {
  ICardProvider,
  ProviderResponse,
  PaginatedResult,
  // Cardholder types
  CreateCardholderParams,
  UpdateCardholderParams,
  CardholderInfo,
  ListCardholdersParams,
  // Card types
  CreateCardParams,
  CardInfo,
  CardSensitiveInfo,
  ListCardsParams,
  UpdateCardParams,
  UpdateCardStatusParams,
  CardRechargeParams,
  CardRechargeResult,
  CardWithdrawParams,
  CardWithdrawResult,
  ActivateCardParams,
  AssignCardParams,
  ResetPinParams,
  ResetPinResult,
  CardOrderInfo,
  // Transaction types
  ListTransactionsParams,
  CardTransactionInfo,
  // Product types
  CardProductInfo,
  // Balance types
  IssuingBalanceInfo,
  ListBalanceTransactionsParams,
  IssuingBalanceTransactionInfo,
  // Transfer types
  CreateIssuingTransferParams,
  IssuingTransferInfo,
} from '../../card-provider.interface';

import { UqpayClient, UqpayClientConfig } from './uqpay.client';
import {
  UqpayCreateCardholderRequest,
  UqpayCreateCardholderResponse,
  UqpayListCardholdersResponse,
  UqpayUpdateCardholderRequest,
  UqpayUpdateCardholderResponse,
  UqpayCardholderItem,
  UqpayCardholderStatus,
  // Card types
  UqpayCreateCardRequest,
  UqpayCreateCardResponse,
  UqpayListCardsResponse,
  UqpayUpdateCardRequest,
  UqpayUpdateCardResponse,
  UqpayCardItem,
  UqpayCardStatus,
  UqpayUpdateCardStatusRequest,
  UqpayUpdateCardStatusResponse,
  UqpaySensitiveCardDetailsResponse,
  UqpayCardFundRequest,
  UqpayCardFundResponse,
  UqpayCardOrderResponse,
  UqpayActivateCardRequest,
  UqpayActivateCardResponse,
  UqpayAssignCardRequest,
  UqpayAssignCardResponse,
  UqpayResetPinRequest,
  UqpayResetPinResponse,
  // Transaction types
  UqpayTransactionItem,
  UqpayListTransactionsResponse,
  UqpayTransactionType,
  UqpayTransactionStatus,
  // Product types
  UqpayProductItem,
  UqpayListProductsResponse,
  // Balance types
  UqpayBalanceItem,
  UqpayListBalancesResponse,
  UqpayRetrieveBalanceRequest,
  UqpayBalanceTransactionItem,
  UqpayListBalanceTransactionsResponse,
  // Transfer types
  UqpayCreateTransferRequest,
  UqpayCreateTransferResponse,
  UqpayTransferItem,
} from './uqpay.types';

/**
 * UQPAY 服务商适配器
 * 实现 ICardProvider 接口，对接 UQPAY Issuing API
 */
export class UqpayAdapter implements ICardProvider {
  private readonly logger = new Logger(UqpayAdapter.name);
  private client: UqpayClient;

  readonly providerCode = 'uqpay';
  readonly providerName = 'UQPAY';

  /**
   * 初始化适配器
   */
  async initialize(config: Record<string, any>): Promise<void> {
    const clientConfig: UqpayClientConfig = {
      apiBaseUrl: config.apiBaseUrl || 'https://api-sandbox.uqpaytech.com/api',
      apiToken: config.apiKey,
      timeout: config.timeout || 30000,
      onBehalfOf: config.onBehalfOf,
    };

    this.client = new UqpayClient(clientConfig);
    this.logger.log(`UQPAY adapter initialized with base URL: ${clientConfig.apiBaseUrl}`);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    return this.client.healthCheck();
  }

  // ============ Cardholder 持卡人相关 ============

  /**
   * 创建持卡人
   */
  async createCardholder(
    params: CreateCardholderParams,
  ): Promise<ProviderResponse<CardholderInfo>> {
    // 转换为 UQPAY 请求格式
    const request: UqpayCreateCardholderRequest = {
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      date_of_birth: params.dateOfBirth,
      country_code: params.address.country,
      phone_number: params.phone || '',
      delivery_address: {
        line1: params.address.line1,
        line2: params.address.line2,
        city: params.address.city,
        state: params.address.state,
        country: params.address.country,
        postal_code: params.address.postalCode,
      },
    };

    const response = await this.client.post<UqpayCreateCardholderResponse>(
      '/v1/issuing/cardholders',
      request,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'CREATE_CARDHOLDER_FAILED',
          message: response.error?.message || 'Failed to create cardholder',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    // 创建成功后获取完整信息
    const retrieveResponse = await this.retrieveCardholder(response.data!.cardholder_id);
    if (retrieveResponse.success) {
      return retrieveResponse;
    }

    // 如果获取失败，返回基本信息
    return {
      success: true,
      data: {
        providerCardholderId: response.data!.cardholder_id,
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        phone: params.phone,
        idType: params.idType,
        idNumber: params.idNumber,
        nationality: params.nationality,
        dateOfBirth: params.dateOfBirth,
        address: params.address,
        kycStatus: this.mapCardholderStatusToKyc(response.data!.cardholder_status),
        status: this.mapCardholderStatus(response.data!.cardholder_status),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * 获取持卡人列表
   */
  async listCardholders(
    params: ListCardholdersParams,
  ): Promise<ProviderResponse<PaginatedResult<CardholderInfo>>> {
    const query: Record<string, any> = {
      page_size: params.pageSize || 10,
      page_number: params.page || 1,
    };

    // 状态映射
    if (params.status) {
      query.cardholder_status = this.mapStatusToUqpay(params.status);
    }

    const response = await this.client.get<UqpayListCardholdersResponse>(
      '/v1/issuing/cardholders',
      query,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'LIST_CARDHOLDERS_FAILED',
          message: response.error?.message || 'Failed to list cardholders',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    const data = response.data!;
    return {
      success: true,
      data: {
        items: data.data.map((item) => this.transformCardholder(item)),
        total: data.total_items,
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        totalPages: data.total_pages,
      },
    };
  }

  /**
   * 更新持卡人信息
   */
  async updateCardholder(
    params: UpdateCardholderParams,
  ): Promise<ProviderResponse<CardholderInfo>> {
    const request: UqpayUpdateCardholderRequest = {};

    if (params.email) {
      request.email = params.email;
    }
    if (params.phone) {
      request.phone_number = params.phone;
    }
    if (params.address) {
      request.delivery_address = {
        line1: params.address.line1 || '',
        line2: params.address.line2,
        city: params.address.city || '',
        state: params.address.state,
        country: params.address.country || '',
        postal_code: params.address.postalCode || '',
      };
      if (params.address.country) {
        request.country_code = params.address.country;
      }
    }

    const response = await this.client.post<UqpayUpdateCardholderResponse>(
      `/v1/issuing/cardholders/${params.providerCardholderId}`,
      request,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'UPDATE_CARDHOLDER_FAILED',
          message: response.error?.message || 'Failed to update cardholder',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    // 更新成功后获取完整信息
    return this.retrieveCardholder(params.providerCardholderId);
  }

  /**
   * 获取持卡人详情
   */
  async retrieveCardholder(
    providerCardholderId: string,
  ): Promise<ProviderResponse<CardholderInfo>> {
    const response = await this.client.get<UqpayCardholderItem>(
      `/v1/issuing/cardholders/${providerCardholderId}`,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'RETRIEVE_CARDHOLDER_FAILED',
          message: response.error?.message || 'Failed to retrieve cardholder',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    return {
      success: true,
      data: this.transformCardholder(response.data!),
    };
  }

  // ============ 辅助方法 ============

  /**
   * 转换 UQPAY 持卡人数据为标准格式
   */
  private transformCardholder(item: UqpayCardholderItem): CardholderInfo {
    return {
      providerCardholderId: item.cardholder_id,
      firstName: item.first_name,
      lastName: item.last_name,
      email: item.email,
      phone: item.phone_number,
      idType: 'passport', // UQPAY 不返回证件类型，默认护照
      idNumber: '', // UQPAY 不返回证件号
      nationality: item.country_code,
      dateOfBirth: item.date_of_birth || '',
      address: {
        line1: item.delivery_address?.line1 || '',
        line2: item.delivery_address?.line2,
        city: item.delivery_address?.city || '',
        state: item.delivery_address?.state,
        country: item.delivery_address?.country || item.country_code,
        postalCode: item.delivery_address?.postal_code || '',
      },
      kycStatus: this.mapCardholderStatusToKyc(item.cardholder_status),
      status: this.mapCardholderStatus(item.cardholder_status),
      createdAt: this.parseUqpayDateTime(item.create_time),
      updatedAt: this.parseUqpayDateTime(item.create_time), // UQPAY 不返回更新时间
      metadata: {
        number_of_cards: item.number_of_cards,
        review_status: item.review_status,
      },
    };
  }

  /**
   * 映射 UQPAY 持卡人状态到标准 KYC 状态
   */
  private mapCardholderStatusToKyc(
    status: UqpayCardholderStatus,
  ): 'pending' | 'approved' | 'rejected' | 'not_required' {
    switch (status) {
      case 'PENDING':
      case 'INCOMPLETE':
        return 'pending';
      case 'SUCCESS':
        return 'approved';
      case 'FAILED':
        return 'rejected';
      default:
        return 'pending';
    }
  }

  /**
   * 映射 UQPAY 持卡人状态到标准状态
   */
  private mapCardholderStatus(
    status: UqpayCardholderStatus,
  ): 'active' | 'inactive' | 'suspended' {
    switch (status) {
      case 'SUCCESS':
        return 'active';
      case 'PENDING':
      case 'INCOMPLETE':
        return 'inactive';
      case 'FAILED':
        return 'suspended';
      default:
        return 'inactive';
    }
  }

  /**
   * 映射标准状态到 UQPAY 状态
   */
  private mapStatusToUqpay(
    status: 'active' | 'inactive' | 'suspended',
  ): UqpayCardholderStatus {
    switch (status) {
      case 'active':
        return 'SUCCESS';
      case 'inactive':
        return 'PENDING';
      case 'suspended':
        return 'FAILED';
      default:
        return 'PENDING';
    }
  }

  /**
   * 解析 UQPAY 日期时间格式
   */
  private parseUqpayDateTime(dateTimeStr: string): string {
    if (!dateTimeStr) {
      return new Date().toISOString();
    }
    // UQPAY 格式: "2024-05-09 15:52:23"
    try {
      const date = new Date(dateTimeStr.replace(' ', 'T') + 'Z');
      return date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  // ============ Card 卡片相关 ============

  /**
   * 创建卡片
   */
  async createCard(params: CreateCardParams): Promise<ProviderResponse<CardInfo>> {
    const request: UqpayCreateCardRequest = {
      card_currency: (params.currency as 'SGD' | 'USD') || 'USD',
      cardholder_id: params.cardholderId,
      card_product_id: params.productId,
      card_limit: params.initialBalance,
      metadata: params.metadata,
    };

    const response = await this.client.post<UqpayCreateCardResponse>(
      '/v1/issuing/cards',
      request,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'CREATE_CARD_FAILED',
          message: response.error?.message || 'Failed to create card',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    // 创建成功后获取完整卡片信息
    const retrieveResponse = await this.retrieveCard(response.data!.card_id);
    if (retrieveResponse.success) {
      return retrieveResponse;
    }

    // 返回基本信息
    return {
      success: true,
      data: {
        providerCardId: response.data!.card_id,
        productId: params.productId,
        cardholderId: params.cardholderId,
        cardForm: 'virtual',
        cardMode: 'single',
        cardBrand: 'visa',
        cardNumberMasked: '************0000',
        expiryDate: '',
        currency: params.currency || 'USD',
        balance: params.initialBalance || 0,
        availableBalance: params.initialBalance || 0,
        status: this.mapCardStatus(response.data!.card_status),
        dailyLimit: 0,
        monthlyLimit: 0,
        dailyUsed: 0,
        monthlyUsed: 0,
        createdAt: response.data!.create_time,
        updatedAt: response.data!.create_time,
        metadata: {
          card_order_id: response.data!.card_order_id,
          order_status: response.data!.order_status,
        },
      },
    };
  }

  /**
   * 获取卡片列表
   */
  async listCards(
    params: ListCardsParams,
  ): Promise<ProviderResponse<PaginatedResult<CardInfo>>> {
    const query: Record<string, any> = {
      page_size: params.pageSize || 10,
      page_number: params.page || 1,
    };

    if (params.cardholderId) {
      query.cardholder_id = params.cardholderId;
    }
    if (params.status) {
      query.card_status = this.mapStatusToUqpayCard(params.status);
    }

    const response = await this.client.get<UqpayListCardsResponse>(
      '/v1/issuing/cards',
      query,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'LIST_CARDS_FAILED',
          message: response.error?.message || 'Failed to list cards',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    const data = response.data!;
    return {
      success: true,
      data: {
        items: data.data.map((item) => this.transformCard(item)),
        total: data.total_items,
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        totalPages: data.total_pages,
      },
    };
  }

  /**
   * 更新卡片信息
   */
  async updateCard(params: UpdateCardParams): Promise<ProviderResponse<CardInfo>> {
    const request: UqpayUpdateCardRequest = {};

    if (params.dailyLimit !== undefined || params.monthlyLimit !== undefined) {
      request.card_limit = params.monthlyLimit || params.dailyLimit;
    }
    if (params.metadata) {
      request.metadata = params.metadata;
    }

    const response = await this.client.post<UqpayUpdateCardResponse>(
      `/v1/issuing/cards/${params.providerCardId}`,
      request,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'UPDATE_CARD_FAILED',
          message: response.error?.message || 'Failed to update card',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    // 更新成功后获取完整卡片信息
    return this.retrieveCard(params.providerCardId);
  }

  /**
   * 获取卡片详情
   */
  async retrieveCard(providerCardId: string): Promise<ProviderResponse<CardInfo>> {
    const response = await this.client.get<UqpayCardItem>(
      `/v1/issuing/cards/${providerCardId}`,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'RETRIEVE_CARD_FAILED',
          message: response.error?.message || 'Failed to retrieve card',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    return {
      success: true,
      data: this.transformCard(response.data!),
    };
  }

  /**
   * 更新卡片状态 (激活/冻结/注销)
   */
  async updateCardStatus(
    params: UpdateCardStatusParams,
  ): Promise<ProviderResponse<CardInfo>> {
    const request: UqpayUpdateCardStatusRequest = {
      card_status: this.mapStatusToUqpayCard(params.status) as 'ACTIVE' | 'FROZEN' | 'CANCELLED',
      update_reason: params.reason,
    };

    const response = await this.client.post<UqpayUpdateCardStatusResponse>(
      `/v1/issuing/cards/${params.providerCardId}/status`,
      request,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'UPDATE_CARD_STATUS_FAILED',
          message: response.error?.message || 'Failed to update card status',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    // 更新成功后获取完整卡片信息
    return this.retrieveCard(params.providerCardId);
  }

  /**
   * 获取卡片敏感信息 (完整卡号、CVV)
   */
  async retrieveSensitiveCardDetails(
    providerCardId: string,
  ): Promise<ProviderResponse<CardSensitiveInfo>> {
    const response = await this.client.get<UqpaySensitiveCardDetailsResponse>(
      `/v1/issuing/cards/${providerCardId}/secure`,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'RETRIEVE_SENSITIVE_FAILED',
          message: response.error?.message || 'Failed to retrieve sensitive card details',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    return {
      success: true,
      data: {
        providerCardId,
        cardNumber: response.data!.card_number,
        cvv: response.data!.cvv,
        expiryDate: response.data!.expire_date,
      },
    };
  }

  /**
   * 卡片充值
   */
  async rechargeCard(
    params: CardRechargeParams,
  ): Promise<ProviderResponse<CardRechargeResult>> {
    const request: UqpayCardFundRequest = {
      amount: params.amount,
    };

    const response = await this.client.post<UqpayCardFundResponse>(
      `/v1/issuing/cards/${params.providerCardId}/recharge`,
      request,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'RECHARGE_CARD_FAILED',
          message: response.error?.message || 'Failed to recharge card',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    return {
      success: true,
      data: {
        transactionId: response.data!.card_order_id,
        providerCardId: response.data!.card_id,
        amount: response.data!.amount,
        fee: 0, // UQPAY 不返回手续费，需要单独计算
        currency: response.data!.card_currency,
        newBalance: 0, // 需要再次查询卡片获取新余额
        status: response.data!.order_status === 'SUCCESS' ? 'completed' :
                response.data!.order_status === 'FAILED' ? 'failed' : 'pending',
        createdAt: response.data!.create_time,
      },
    };
  }

  /**
   * 卡片提现
   */
  async withdrawCard(
    params: CardWithdrawParams,
  ): Promise<ProviderResponse<CardWithdrawResult>> {
    const request: UqpayCardFundRequest = {
      amount: params.amount,
    };

    const response = await this.client.post<UqpayCardFundResponse>(
      `/v1/issuing/cards/${params.providerCardId}/withdraw`,
      request,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'WITHDRAW_CARD_FAILED',
          message: response.error?.message || 'Failed to withdraw from card',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    return {
      success: true,
      data: {
        transactionId: response.data!.card_order_id,
        providerCardId: response.data!.card_id,
        amount: response.data!.amount,
        fee: 0,
        currency: response.data!.card_currency,
        newBalance: 0,
        status: response.data!.order_status === 'SUCCESS' ? 'completed' :
                response.data!.order_status === 'FAILED' ? 'failed' : 'pending',
        createdAt: response.data!.create_time,
      },
    };
  }

  /**
   * 获取卡片订单详情
   */
  async retrieveCardOrder(orderId: string): Promise<ProviderResponse<CardOrderInfo>> {
    const response = await this.client.get<UqpayCardOrderResponse>(
      `/v1/issuing/cards/${orderId}/order`,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'RETRIEVE_ORDER_FAILED',
          message: response.error?.message || 'Failed to retrieve card order',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    const orderTypeMap: Record<string, CardOrderInfo['type']> = {
      'CREATE_CARD': 'create',
      'RECHARGE': 'recharge',
      'WITHDRAW': 'withdraw',
    };

    return {
      success: true,
      data: {
        orderId: response.data!.card_order_id,
        providerCardId: response.data!.card_id,
        type: orderTypeMap[response.data!.order_type] || 'create',
        amount: response.data!.amount,
        currency: response.data!.card_currency,
        status: response.data!.order_status === 'SUCCESS' ? 'completed' :
                response.data!.order_status === 'FAILED' ? 'failed' : 'pending',
        createdAt: response.data!.create_time,
        completedAt: response.data!.complete_time,
      },
    };
  }

  /**
   * 激活卡片 (主要用于实体卡)
   */
  async activateCard(params: ActivateCardParams): Promise<ProviderResponse<CardInfo>> {
    const request: UqpayActivateCardRequest = {
      card_id: params.providerCardId,
      activation_code: params.activationCode || '',
      pin: '000000', // 默认 PIN，实际应该从参数获取
    };

    const response = await this.client.post<UqpayActivateCardResponse>(
      '/v1/issuing/cards/activate',
      request,
    );

    if (!response.success || response.data?.request_status !== 'SUCCESS') {
      return {
        success: false,
        error: {
          code: response.error?.code || 'ACTIVATE_CARD_FAILED',
          message: response.error?.message || 'Failed to activate card',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    // 激活成功后获取完整卡片信息
    return this.retrieveCard(params.providerCardId);
  }

  /**
   * 分配卡片给持卡人 (主要用于预制卡)
   */
  async assignCard(params: AssignCardParams): Promise<ProviderResponse<CardInfo>> {
    // 注意: UQPAY assign 需要完整卡号，这里需要从外部传入
    const request: UqpayAssignCardRequest = {
      cardholder_id: params.cardholderId,
      card_number: params.providerCardId, // 这里实际应该是完整卡号
      card_currency: 'USD',
      card_mode: 'SINGLE',
    };

    const response = await this.client.post<UqpayAssignCardResponse>(
      '/v1/issuing/cards/assign',
      request,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'ASSIGN_CARD_FAILED',
          message: response.error?.message || 'Failed to assign card',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    // 分配成功后获取完整卡片信息
    return this.retrieveCard(response.data!.card_id);
  }

  /**
   * 重置卡片 PIN 码
   */
  async resetCardPin(params: ResetPinParams): Promise<ProviderResponse<ResetPinResult>> {
    const request: UqpayResetPinRequest = {
      card_id: params.providerCardId,
      pin: params.newPin || '000000', // 6位数字 PIN
    };

    const response = await this.client.post<UqpayResetPinResponse>(
      '/v1/issuing/cards/pin',
      request,
    );

    if (!response.success || response.data?.request_status !== 'SUCCESS') {
      return {
        success: false,
        error: {
          code: response.error?.code || 'RESET_PIN_FAILED',
          message: response.error?.message || 'Failed to reset card PIN',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    return {
      success: true,
      data: {
        providerCardId: params.providerCardId,
        success: true,
        message: 'PIN reset successfully',
      },
    };
  }

  // ============ Card 辅助方法 ============

  /**
   * 转换 UQPAY 卡片数据为标准格式
   */
  private transformCard(item: UqpayCardItem): CardInfo {
    return {
      providerCardId: item.card_id,
      productId: item.card_product_id,
      cardholderId: item.cardholder?.cardholder_id || '',
      cardForm: item.form_factor === 'VIRTUAL' ? 'virtual' : 'physical',
      cardMode: item.mode_type === 'SINGLE' ? 'single' : 'shared',
      cardBrand: item.card_scheme === 'MASTERCARD' ? 'mastercard' : 'visa',
      cardNumberMasked: item.card_number,
      expiryDate: '', // UQPAY 不在列表返回过期日期
      currency: item.card_currency,
      balance: item.card_limit,
      availableBalance: item.available_balance,
      status: this.mapCardStatus(item.card_status),
      dailyLimit: item.card_limit,
      monthlyLimit: item.card_limit,
      dailyUsed: parseFloat(item.consumed_amount || '0'),
      monthlyUsed: parseFloat(item.consumed_amount || '0'),
      createdAt: this.parseUqpayDateTime(item.cardholder?.create_time || ''),
      updatedAt: this.parseUqpayDateTime(item.cardholder?.create_time || ''),
      metadata: {
        card_bin: item.card_bin,
        spending_controls: item.spending_controls,
        risk_controls: item.risk_controls,
        no_pin_payment_amount: item.no_pin_payment_amount,
        update_reason: item.update_reason,
      },
    };
  }

  /**
   * 映射 UQPAY 卡片状态到标准状态
   */
  private mapCardStatus(status: UqpayCardStatus): 'pending' | 'active' | 'frozen' | 'cancelled' | 'expired' {
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'ACTIVE':
        return 'active';
      case 'FROZEN':
      case 'BLOCKED':
        return 'frozen';
      case 'PRE_CANCEL':
      case 'CANCELLED':
      case 'LOST':
      case 'STOLEN':
        return 'cancelled';
      case 'FAILED':
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  /**
   * 映射标准状态到 UQPAY 卡片状态
   */
  private mapStatusToUqpayCard(
    status: 'pending' | 'active' | 'frozen' | 'cancelled' | 'expired',
  ): UqpayCardStatus {
    switch (status) {
      case 'active':
        return 'ACTIVE';
      case 'frozen':
        return 'FROZEN';
      case 'cancelled':
        return 'CANCELLED';
      case 'pending':
      default:
        return 'PENDING';
    }
  }

  // ============ Transaction 交易相关 ============

  /**
   * 获取卡片交易列表
   */
  async listCardTransactions(
    params: ListTransactionsParams,
  ): Promise<ProviderResponse<PaginatedResult<CardTransactionInfo>>> {
    const query: Record<string, any> = {
      page_size: params.pageSize || 10,
      page_number: params.page || 1,
    };

    if (params.cardId) {
      query.card_id = params.cardId;
    }
    if (params.startTime) {
      query.start_time = params.startTime;
    }
    if (params.endTime) {
      query.end_time = params.endTime;
    }

    const response = await this.client.get<UqpayListTransactionsResponse>(
      '/v1/issuing/transactions',
      query,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'LIST_TRANSACTIONS_FAILED',
          message: response.error?.message || 'Failed to list transactions',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    const data = response.data!;
    return {
      success: true,
      data: {
        items: data.data.map((item) => this.transformTransaction(item)),
        total: data.total_items,
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        totalPages: data.total_pages,
      },
    };
  }

  /**
   * 获取交易详情
   */
  async retrieveCardTransaction(
    providerTransactionId: string,
  ): Promise<ProviderResponse<CardTransactionInfo>> {
    const response = await this.client.get<UqpayTransactionItem>(
      `/v1/issuing/transactions/${providerTransactionId}`,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'RETRIEVE_TRANSACTION_FAILED',
          message: response.error?.message || 'Failed to retrieve transaction',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    return {
      success: true,
      data: this.transformTransaction(response.data!),
    };
  }

  /**
   * 转换 UQPAY 交易数据为标准格式
   */
  private transformTransaction(item: UqpayTransactionItem): CardTransactionInfo {
    return {
      providerTransactionId: item.transaction_id,
      cardId: item.card_id,
      type: this.mapTransactionType(item.transaction_type),
      amount: item.transaction_amount,
      currency: item.transaction_currency,
      billingAmount: item.billing_amount,
      billingCurrency: item.billing_currency,
      fee: item.transaction_fee,
      feeCurrency: item.transaction_fee_currency,
      merchantName: item.merchant_data?.name,
      merchantCategory: item.merchant_data?.category_code,
      merchantCity: item.merchant_data?.city,
      merchantCountry: item.merchant_data?.country,
      status: this.mapTransactionStatus(item.transaction_status),
      declineReason: item.description,
      transactionTime: item.transaction_time,
      postedTime: item.posted_time,
      cardBalanceAfter: item.card_available_balance,
      metadata: {
        short_transaction_id: item.short_transaction_id,
        original_transaction_id: item.original_transaction_id,
        authorization_code: item.authorization_code,
        wallet_type: item.wallet_type,
        fee_pass_through: item.fee_pass_through,
      },
    };
  }

  /**
   * 映射 UQPAY 交易类型
   */
  private mapTransactionType(
    type: UqpayTransactionType,
  ): 'purchase' | 'refund' | 'atm' | 'fee' | 'adjustment' | 'authorization' | 'reversal' {
    switch (type) {
      case 'AUTHORIZATION':
        return 'authorization';
      case 'SETTLEMENT':
        return 'purchase';
      case 'REFUND':
        return 'refund';
      case 'REVERSAL':
        return 'reversal';
      case 'ATM':
        return 'atm';
      case 'FEE':
        return 'fee';
      case 'ADJUSTMENT':
        return 'adjustment';
      default:
        return 'purchase';
    }
  }

  /**
   * 映射 UQPAY 交易状态
   */
  private mapTransactionStatus(
    status: UqpayTransactionStatus,
  ): 'pending' | 'completed' | 'declined' | 'reversed' {
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'COMPLETED':
        return 'completed';
      case 'DECLINED':
        return 'declined';
      case 'REVERSED':
        return 'reversed';
      default:
        return 'pending';
    }
  }

  // ============ Product 卡产品相关 ============

  /**
   * 获取卡产品列表
   */
  async listCardProducts(): Promise<ProviderResponse<CardProductInfo[]>> {
    // 获取所有产品 (分页获取全部)
    const allProducts: CardProductInfo[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.client.get<UqpayListProductsResponse>(
        '/v1/issuing/products',
        { page_size: 100, page_number: page },
      );

      if (!response.success) {
        return {
          success: false,
          error: {
            code: response.error?.code || 'LIST_PRODUCTS_FAILED',
            message: response.error?.message || 'Failed to list products',
            providerCode: response.error?.code,
            providerMessage: response.error?.message,
          },
        };
      }

      const data = response.data!;
      allProducts.push(...data.data.map((item) => this.transformProduct(item)));

      if (page >= data.total_pages) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return {
      success: true,
      data: allProducts,
    };
  }

  /**
   * 转换 UQPAY 产品数据为标准格式
   */
  private transformProduct(item: UqpayProductItem): CardProductInfo {
    return {
      providerProductId: item.product_id,
      name: `${item.card_scheme} ${item.mode_type}`, // UQPAY 不返回产品名称
      description: `BIN: ${item.card_bin}`,
      cardForm: item.card_form.includes('VIR') ? 'virtual' : 'physical',
      cardMode: item.mode_type === 'SINGLE' ? 'single' : 'shared',
      cardBrand: item.card_scheme === 'MASTERCARD' ? 'mastercard' : 'visa',
      currencies: item.card_currency,
      cardBin: item.card_bin,
      maxCardQuota: item.max_card_quota,
      status: item.product_status === 'ENABLED' ? 'active' : 'inactive',
      metadata: {
        no_pin_payment_amount: item.no_pin_payment_amount,
        create_time: item.create_time,
        update_time: item.update_time,
      },
    };
  }

  // ============ Balance 发行余额相关 ============

  /**
   * 获取发行余额
   * 如果指定 currency 则使用 POST 获取单个货币余额
   * 否则使用 GET 获取所有余额
   */
  async retrieveIssuingBalance(
    currency?: string,
  ): Promise<ProviderResponse<IssuingBalanceInfo[]>> {
    if (currency) {
      // POST 获取指定货币余额
      const request: UqpayRetrieveBalanceRequest = { currency };
      const response = await this.client.post<UqpayBalanceItem>(
        '/v1/issuing/balances',
        request,
      );

      if (!response.success) {
        return {
          success: false,
          error: {
            code: response.error?.code || 'RETRIEVE_BALANCE_FAILED',
            message: response.error?.message || 'Failed to retrieve balance',
            providerCode: response.error?.code,
            providerMessage: response.error?.message,
          },
        };
      }

      return {
        success: true,
        data: [this.transformBalance(response.data!)],
      };
    }

    // GET 获取所有余额
    const allBalances: IssuingBalanceInfo[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.client.get<UqpayListBalancesResponse>(
        '/v1/issuing/balances',
        { page_size: 100, page_number: page },
      );

      if (!response.success) {
        return {
          success: false,
          error: {
            code: response.error?.code || 'LIST_BALANCES_FAILED',
            message: response.error?.message || 'Failed to list balances',
            providerCode: response.error?.code,
            providerMessage: response.error?.message,
          },
        };
      }

      const data = response.data!;
      allBalances.push(...data.data.map((item) => this.transformBalance(item)));

      if (page >= data.total_pages) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return {
      success: true,
      data: allBalances,
    };
  }

  /**
   * 获取发行余额交易列表
   */
  async listIssuingBalanceTransactions(
    params: ListBalanceTransactionsParams,
  ): Promise<ProviderResponse<PaginatedResult<IssuingBalanceTransactionInfo>>> {
    const query: Record<string, any> = {
      page_size: params.pageSize || 10,
      page_number: params.page || 1,
    };

    if (params.startTime) {
      query.start_time = params.startTime;
    }
    if (params.endTime) {
      query.end_time = params.endTime;
    }

    const response = await this.client.get<UqpayListBalanceTransactionsResponse>(
      '/v1/issuing/balances/transactions',
      query,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'LIST_BALANCE_TRANSACTIONS_FAILED',
          message: response.error?.message || 'Failed to list balance transactions',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    const data = response.data!;
    return {
      success: true,
      data: {
        items: data.data.map((item) => this.transformBalanceTransaction(item)),
        total: data.total_items,
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        totalPages: data.total_pages,
      },
    };
  }

  /**
   * 转换 UQPAY 余额数据为标准格式
   */
  private transformBalance(item: UqpayBalanceItem): IssuingBalanceInfo {
    return {
      balanceId: item.balance_id,
      currency: item.currency,
      availableBalance: item.available_balance,
      frozenBalance: item.frozen_balance,
      marginBalance: item.margin_balance,
      totalBalance: item.available_balance + item.frozen_balance,
      status: item.balance_status === 'ACTIVE' ? 'active' : 'inactive',
      lastTradeTime: item.last_trade_time,
      createdAt: item.create_time,
    };
  }

  /**
   * 转换 UQPAY 余额交易数据为标准格式
   */
  private transformBalanceTransaction(
    item: UqpayBalanceTransactionItem,
  ): IssuingBalanceTransactionInfo {
    const typeMap: Record<string, IssuingBalanceTransactionInfo['type']> = {
      DEPOSIT: 'deposit',
      WITHDRAW: 'withdraw',
      CARD_LOAD: 'card_load',
      CARD_UNLOAD: 'card_unload',
      FEE: 'fee',
      ADJUSTMENT: 'adjustment',
    };

    const statusMap: Record<string, IssuingBalanceTransactionInfo['status']> = {
      PENDING: 'pending',
      COMPLETED: 'completed',
      FAILED: 'failed',
    };

    return {
      transactionId: item.transaction_id,
      balanceId: item.balance_id,
      type: typeMap[item.transaction_type] || 'adjustment',
      amount: item.amount,
      currency: item.currency,
      endingBalance: item.ending_balance,
      status: statusMap[item.transaction_status] || 'pending',
      description: item.description,
      createdAt: item.create_time,
      completedAt: item.complete_time,
      metadata: {
        short_transaction_id: item.short_transaction_id,
        account_id: item.account_id,
      },
    };
  }

  // ============ Transfer 发行转账相关 ============

  /**
   * 创建发行转账 (主账户与子账户间)
   */
  async createIssuingTransfer(
    params: CreateIssuingTransferParams,
  ): Promise<ProviderResponse<IssuingTransferInfo>> {
    const request: UqpayCreateTransferRequest = {
      source_account_id: params.sourceAccountId,
      destination_account_id: params.destinationAccountId,
      currency: params.currency,
      amount: params.amount,
      remark: params.remark,
    };

    const response = await this.client.post<UqpayCreateTransferResponse>(
      '/v1/issuing/transfers',
      request,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'CREATE_TRANSFER_FAILED',
          message: response.error?.message || 'Failed to create transfer',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    // 创建成功后获取完整转账信息
    return this.retrieveIssuingTransfer(response.data!.transfer_id);
  }

  /**
   * 获取转账详情
   */
  async retrieveIssuingTransfer(
    transferId: string,
  ): Promise<ProviderResponse<IssuingTransferInfo>> {
    const response = await this.client.get<UqpayTransferItem>(
      `/v1/issuing/transfers/${transferId}`,
    );

    if (!response.success) {
      return {
        success: false,
        error: {
          code: response.error?.code || 'RETRIEVE_TRANSFER_FAILED',
          message: response.error?.message || 'Failed to retrieve transfer',
          providerCode: response.error?.code,
          providerMessage: response.error?.message,
        },
      };
    }

    return {
      success: true,
      data: this.transformTransfer(response.data!),
    };
  }

  /**
   * 转换 UQPAY 转账数据为标准格式
   */
  private transformTransfer(item: UqpayTransferItem): IssuingTransferInfo {
    const statusMap: Record<string, IssuingTransferInfo['status']> = {
      pending: 'pending',
      completed: 'completed',
      failed: 'failed',
    };

    return {
      transferId: item.transfer_id,
      referenceId: item.reference_id,
      sourceAccountId: item.source_account_id,
      destinationAccountId: item.destination_account_id,
      amount: item.amount,
      fee: item.fee_amount || 0,
      currency: item.currency,
      status: statusMap[item.transfer_status] || 'pending',
      remark: item.remark,
      createdAt: item.create_time,
      completedAt: item.complete_time,
      metadata: {
        creator_id: item.creator_id,
      },
    };
  }
}
