/**
 * U卡服务商抽象接口
 * 定义统一的服务商 API 调用规范，支持多服务商适配
 */

// ============ 通用类型 ============

export interface ProviderResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    providerCode?: string;
    providerMessage?: string;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============ 持卡人相关类型 ============

export interface CreateCardholderParams {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  idType: 'passport' | 'id_card' | 'driver_license';
  idNumber: string;
  nationality: string;
  dateOfBirth: string; // YYYY-MM-DD
  address: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    country: string;
    postalCode: string;
  };
  metadata?: Record<string, any>;
}

export interface UpdateCardholderParams {
  providerCardholderId: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  metadata?: Record<string, any>;
}

export interface CardholderInfo {
  providerCardholderId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  idType: string;
  idNumber: string;
  nationality: string;
  dateOfBirth: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    country: string;
    postalCode: string;
  };
  kycStatus: 'pending' | 'approved' | 'rejected' | 'not_required';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface ListCardholdersParams extends PaginationParams {
  status?: 'active' | 'inactive' | 'suspended';
  kycStatus?: 'pending' | 'approved' | 'rejected';
}

// ============ 卡片相关类型 ============

export type CardForm = 'virtual' | 'physical';
export type CardMode = 'single' | 'shared';
export type CardBrand = 'visa' | 'mastercard' | 'unionpay';
export type CardStatus = 'pending' | 'active' | 'frozen' | 'cancelled' | 'expired';

export interface CreateCardParams {
  cardholderId: string;
  productId: string;
  initialBalance?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface CardInfo {
  providerCardId: string;
  productId: string;
  cardholderId: string;
  cardForm: CardForm;
  cardMode: CardMode;
  cardBrand: CardBrand;
  cardNumberMasked: string; // **** **** **** 1234
  expiryDate: string; // MM/YY
  currency: string;
  balance: number;
  availableBalance: number;
  status: CardStatus;
  dailyLimit: number;
  monthlyLimit: number;
  dailyUsed: number;
  monthlyUsed: number;
  activatedAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface CardSensitiveInfo {
  providerCardId: string;
  cardNumber: string;
  cvv: string;
  expiryDate: string;
}

export interface ListCardsParams extends PaginationParams {
  cardholderId?: string;
  status?: CardStatus;
  cardForm?: CardForm;
}

export interface UpdateCardParams {
  providerCardId: string;
  dailyLimit?: number;
  monthlyLimit?: number;
  metadata?: Record<string, any>;
}

export interface UpdateCardStatusParams {
  providerCardId: string;
  status: 'active' | 'frozen' | 'cancelled';
  reason?: string;
}

export interface CardRechargeParams {
  providerCardId: string;
  amount: number;
  currency?: string;
  remark?: string;
}

export interface CardRechargeResult {
  transactionId: string;
  providerCardId: string;
  amount: number;
  fee: number;
  currency: string;
  newBalance: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface CardWithdrawParams {
  providerCardId: string;
  amount: number;
  currency?: string;
  remark?: string;
}

export interface CardWithdrawResult {
  transactionId: string;
  providerCardId: string;
  amount: number;
  fee: number;
  currency: string;
  newBalance: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface ActivateCardParams {
  providerCardId: string;
  activationCode?: string;
}

export interface AssignCardParams {
  providerCardId: string;
  cardholderId: string;
}

export interface ResetPinParams {
  providerCardId: string;
  newPin?: string; // Some providers generate automatically
}

export interface ResetPinResult {
  providerCardId: string;
  success: boolean;
  message?: string;
}

// ============ 卡订单相关类型 ============

export interface CardOrderInfo {
  orderId: string;
  providerCardId: string;
  type: 'create' | 'recharge' | 'withdraw' | 'activate';
  amount?: number;
  fee?: number;
  currency?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  failReason?: string;
  createdAt: string;
  completedAt?: string;
}

// ============ 交易相关类型 ============

export type TransactionType =
  | 'purchase'
  | 'refund'
  | 'atm'
  | 'fee'
  | 'adjustment'
  | 'authorization'
  | 'reversal';
export type TransactionStatus = 'pending' | 'completed' | 'declined' | 'reversed';

export interface CardTransactionInfo {
  providerTransactionId: string;
  cardId: string; // Provider card ID
  type: TransactionType;
  amount: number;
  currency: string;
  billingAmount?: number; // Amount in billing currency
  billingCurrency?: string;
  fee?: number;
  feeCurrency?: string;
  merchantName?: string;
  merchantCategory?: string;
  merchantCity?: string;
  merchantCountry?: string;
  status: TransactionStatus;
  declineReason?: string;
  transactionTime: string;
  postedTime?: string;
  cardBalanceAfter?: number;
  metadata?: Record<string, any>;
}

export interface ListTransactionsParams extends PaginationParams {
  cardId?: string; // Provider card ID
  type?: TransactionType;
  status?: TransactionStatus;
  startTime?: string; // ISO 8601 format
  endTime?: string;
}

// ============ 卡产品相关类型 ============

export interface CardProductInfo {
  providerProductId: string;
  name: string;
  description?: string;
  cardForm: CardForm;
  cardMode: CardMode;
  cardBrand: CardBrand;
  currencies: string[]; // Supported currencies
  cardBin?: string;
  maxCardQuota?: number;
  openFee?: number;
  monthlyFee?: number;
  rechargeRate?: number; // Percentage, e.g., 1.5 means 1.5%
  withdrawRate?: number;
  minDeposit?: number;
  maxDeposit?: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  regions?: string[]; // Supported regions/countries
  features?: string[];
  status: 'active' | 'inactive';
  metadata?: Record<string, any>;
}

// ============ 发行余额相关类型 ============

export interface IssuingBalanceInfo {
  balanceId: string;
  currency: string;
  availableBalance: number;
  frozenBalance: number;
  marginBalance?: number;
  totalBalance: number;
  status: 'active' | 'inactive';
  lastTradeTime?: string;
  createdAt: string;
}

export interface IssuingBalanceTransactionInfo {
  transactionId: string;
  balanceId: string;
  type: 'deposit' | 'withdraw' | 'card_load' | 'card_unload' | 'fee' | 'adjustment';
  amount: number;
  currency: string;
  endingBalance: number;
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

export interface ListBalanceTransactionsParams extends PaginationParams {
  currency?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
}

// ============ 发行转账相关类型 ============

/**
 * 发行转账参数
 * 用于主账户与子账户之间的资金划转 (UQPAY 模式)
 */
export interface CreateIssuingTransferParams {
  sourceAccountId: string;
  destinationAccountId: string;
  currency: string;
  amount: number;
  remark?: string;
}

export interface IssuingTransferInfo {
  transferId: string;
  referenceId?: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  fee: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  remark?: string;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

// ============ 服务商接口定义 ============

export interface ICardProvider {
  /**
   * 服务商唯一标识
   */
  readonly providerCode: string;

  /**
   * 服务商名称
   */
  readonly providerName: string;

  /**
   * 初始化服务商连接
   */
  initialize(config: Record<string, any>): Promise<void>;

  /**
   * 健康检查
   */
  healthCheck(): Promise<boolean>;

  // ============ Cardholder 持卡人相关 ============

  /**
   * 创建持卡人
   */
  createCardholder(params: CreateCardholderParams): Promise<ProviderResponse<CardholderInfo>>;

  /**
   * 获取持卡人列表
   */
  listCardholders(params: ListCardholdersParams): Promise<ProviderResponse<PaginatedResult<CardholderInfo>>>;

  /**
   * 更新持卡人信息
   */
  updateCardholder(params: UpdateCardholderParams): Promise<ProviderResponse<CardholderInfo>>;

  /**
   * 获取持卡人详情
   */
  retrieveCardholder(providerCardholderId: string): Promise<ProviderResponse<CardholderInfo>>;

  // ============ Card 卡片相关 ============

  /**
   * 创建卡片
   */
  createCard(params: CreateCardParams): Promise<ProviderResponse<CardInfo>>;

  /**
   * 获取卡片列表
   */
  listCards(params: ListCardsParams): Promise<ProviderResponse<PaginatedResult<CardInfo>>>;

  /**
   * 更新卡片信息
   */
  updateCard(params: UpdateCardParams): Promise<ProviderResponse<CardInfo>>;

  /**
   * 获取卡片详情
   */
  retrieveCard(providerCardId: string): Promise<ProviderResponse<CardInfo>>;

  /**
   * 更新卡片状态 (激活/冻结/注销)
   */
  updateCardStatus(params: UpdateCardStatusParams): Promise<ProviderResponse<CardInfo>>;

  /**
   * 获取卡片敏感信息 (完整卡号、CVV)
   */
  retrieveSensitiveCardDetails(providerCardId: string): Promise<ProviderResponse<CardSensitiveInfo>>;

  /**
   * 卡片充值
   */
  rechargeCard(params: CardRechargeParams): Promise<ProviderResponse<CardRechargeResult>>;

  /**
   * 卡片提现
   */
  withdrawCard(params: CardWithdrawParams): Promise<ProviderResponse<CardWithdrawResult>>;

  /**
   * 获取卡片订单详情
   */
  retrieveCardOrder(orderId: string): Promise<ProviderResponse<CardOrderInfo>>;

  /**
   * 激活卡片 (主要用于实体卡)
   */
  activateCard(params: ActivateCardParams): Promise<ProviderResponse<CardInfo>>;

  /**
   * 分配卡片给持卡人 (主要用于预制卡)
   */
  assignCard(params: AssignCardParams): Promise<ProviderResponse<CardInfo>>;

  /**
   * 重置卡片 PIN 码
   */
  resetCardPin(params: ResetPinParams): Promise<ProviderResponse<ResetPinResult>>;

  // ============ Transaction 交易相关 ============

  /**
   * 获取卡片交易列表
   */
  listCardTransactions(params: ListTransactionsParams): Promise<ProviderResponse<PaginatedResult<CardTransactionInfo>>>;

  /**
   * 获取交易详情
   */
  retrieveCardTransaction(providerTransactionId: string): Promise<ProviderResponse<CardTransactionInfo>>;

  // ============ Product 卡产品相关 ============

  /**
   * 获取可用卡产品列表
   */
  listCardProducts(): Promise<ProviderResponse<CardProductInfo[]>>;

  // ============ Balance 发行余额相关 ============

  /**
   * 获取发行余额
   */
  retrieveIssuingBalance(currency?: string): Promise<ProviderResponse<IssuingBalanceInfo[]>>;

  /**
   * 获取发行余额交易记录
   */
  listIssuingBalanceTransactions(params: ListBalanceTransactionsParams): Promise<ProviderResponse<PaginatedResult<IssuingBalanceTransactionInfo>>>;

  // ============ Transfer 发行转账相关 ============

  /**
   * 创建发行转账 (从发行余额提现)
   */
  createIssuingTransfer(params: CreateIssuingTransferParams): Promise<ProviderResponse<IssuingTransferInfo>>;

  /**
   * 获取发行转账详情
   */
  retrieveIssuingTransfer(transferId: string): Promise<ProviderResponse<IssuingTransferInfo>>;
}

// ============ 服务商配置类型 ============

export interface CardProviderConfig {
  providerCode: string;
  providerName: string;
  apiBaseUrl: string;
  apiKey: string;
  apiSecret: string;
  webhookSecret?: string;
  timeout?: number;
  retryCount?: number;
  enabled: boolean;
  metadata?: Record<string, any>;
}
