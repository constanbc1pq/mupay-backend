/**
 * UQPAY API 类型定义
 * 基于 UQPAY Issuing API 文档
 */

// ============ 通用类型 ============

export interface UqpayDeliveryAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  country: string;
  postal_code: string;
}

export type UqpayDocumentType = 'pdf' | 'png' | 'jpg' | 'jpeg';

export type UqpayCardholderStatus = 'PENDING' | 'SUCCESS' | 'INCOMPLETE' | 'FAILED';

// ============ Cardholder API 类型 ============

// Create Cardholder Request
export interface UqpayCreateCardholderRequest {
  email: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string; // yyyy-mm-dd
  country_code: string; // ISO 3166-1 alpha-2
  phone_number: string;
  delivery_address?: UqpayDeliveryAddress;
  document_type?: UqpayDocumentType;
  document?: string; // Base64 encoded, 2MB limit
}

// Create Cardholder Response
export interface UqpayCreateCardholderResponse {
  cardholder_id: string;
  cardholder_status: UqpayCardholderStatus;
}

// List Cardholders Query Params
export interface UqpayListCardholdersParams {
  page_size?: number; // 10-100, default 10
  page_number?: number; // >= 1, default 1
  cardholder_status?: UqpayCardholderStatus;
}

// Cardholder Item in List
export interface UqpayCardholderItem {
  cardholder_id: string;
  email: string;
  number_of_cards: number;
  first_name: string;
  last_name: string;
  create_time: string; // "2024-05-09 15:52:23"
  cardholder_status: UqpayCardholderStatus;
  date_of_birth?: string;
  country_code: string;
  phone_number: string;
  delivery_address?: UqpayDeliveryAddress;
  review_status?: string;
}

// List Cardholders Response
export interface UqpayListCardholdersResponse {
  total_pages: number;
  total_items: number;
  data: UqpayCardholderItem[];
}

// Update Cardholder Request
export interface UqpayUpdateCardholderRequest {
  country_code?: string;
  email?: string;
  phone_number?: string;
  delivery_address?: UqpayDeliveryAddress;
  document_type?: UqpayDocumentType;
  document?: string;
  date_of_birth?: string;
}

// Update Cardholder Response
export interface UqpayUpdateCardholderResponse {
  cardholder_id: string;
  cardholder_status: UqpayCardholderStatus;
}

// Retrieve Cardholder Response (same as CardholderItem)
export type UqpayRetrieveCardholderResponse = UqpayCardholderItem;

// ============ Card API 类型 ============

export type UqpayCardStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'FROZEN'
  | 'BLOCKED'
  | 'PRE_CANCEL'
  | 'CANCELLED'
  | 'LOST'
  | 'STOLEN'
  | 'FAILED';

export type UqpayFormFactor = 'VIRTUAL' | 'PHYSICAL';
export type UqpayModeType = 'SINGLE' | 'SHARE';
export type UqpayCardScheme = 'VISA' | 'MASTERCARD';
export type UqpayOrderStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type UqpayOrderType = 'CREATE_CARD' | 'RECHARGE' | 'WITHDRAW' | 'STATUS_UPDATE';

export interface UqpaySpendingControl {
  amount: number;
  interval: 'PER_TRANSACTION' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'ALL_TIME';
}

export interface UqpayRiskControls {
  allow_3ds_transactions?: 'Y' | 'N';
  allowed_mcc?: string[] | null;
  blocked_mcc?: string[] | null;
}

// Create Card Request
export interface UqpayCreateCardRequest {
  card_currency: 'SGD' | 'USD';
  cardholder_id: string;
  card_product_id: string;
  card_limit?: number;
  spending_controls?: UqpaySpendingControl[];
  risk_controls?: UqpayRiskControls;
  metadata?: Record<string, any>;
}

// Create Card Response
export interface UqpayCreateCardResponse {
  card_id: string;
  card_order_id: string;
  create_time: string;
  card_status: UqpayCardStatus;
  order_status: UqpayOrderStatus;
}

// Card Item (in list and retrieve)
export interface UqpayCardItem {
  card_id: string;
  card_bin: string;
  card_scheme: UqpayCardScheme;
  card_currency: string;
  card_number: string; // Masked: ************5668
  form_factor: UqpayFormFactor;
  mode_type: UqpayModeType;
  card_product_id: string;
  card_limit: number;
  available_balance: number;
  cardholder: {
    cardholder_id: string;
    cardholder_status: UqpayCardholderStatus;
    create_time: string;
    email: string;
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    country_code?: string;
    phone_number?: string;
    delivery_address?: UqpayDeliveryAddress;
    review_status?: string;
    number_of_cards?: number;
  };
  spending_controls?: UqpaySpendingControl[];
  no_pin_payment_amount?: string;
  risk_controls?: UqpayRiskControls;
  metadata?: Record<string, any>;
  card_status: UqpayCardStatus;
  update_reason?: string;
  consumed_amount?: string;
}

// List Cards Query Params
export interface UqpayListCardsParams {
  page_size?: number;
  page_number?: number;
  card_number?: string;
  card_status?: UqpayCardStatus;
  cardholder_id?: string;
}

// List Cards Response
export interface UqpayListCardsResponse {
  total_pages: number;
  total_items: number;
  data: UqpayCardItem[];
}

// Update Card Request
export interface UqpayUpdateCardRequest {
  card_limit?: number;
  no_pin_payment_amount?: number;
  spending_controls?: UqpaySpendingControl[];
  risk_controls?: UqpayRiskControls;
  metadata?: Record<string, any>;
}

// Update Card Response
export interface UqpayUpdateCardResponse {
  card_id: string;
  card_order_id: string;
  card_status: UqpayCardStatus;
  order_status: UqpayOrderStatus;
}

// Retrieve Card Response (same as CardItem)
export type UqpayRetrieveCardResponse = UqpayCardItem;

// Update Card Status Request
export interface UqpayUpdateCardStatusRequest {
  card_status: 'ACTIVE' | 'FROZEN' | 'CANCELLED';
  update_reason?: string;
}

// Update Card Status Response
export interface UqpayUpdateCardStatusResponse {
  card_id: string;
  card_order_id: string;
  order_status: UqpayOrderStatus;
  update_reason?: string;
}

// Retrieve Sensitive Card Details Response
export interface UqpaySensitiveCardDetailsResponse {
  cvv: string;
  expire_date: string; // MM/YY
  card_number: string; // Full card number
}

// Card Recharge/Withdraw Request
export interface UqpayCardFundRequest {
  amount: number;
}

// Card Recharge/Withdraw Response
export interface UqpayCardFundResponse {
  card_id: string;
  card_order_id: string;
  order_type: UqpayOrderType;
  amount: number;
  card_currency: string;
  create_time: string;
  update_time: string;
  complete_time?: string;
  order_status: UqpayOrderStatus;
}

// Retrieve Card Order Response
export type UqpayCardOrderResponse = UqpayCardFundResponse;

// Activate Card Request
export interface UqpayActivateCardRequest {
  card_id: string;
  activation_code: string;
  pin: string; // 6-digit numeric
  no_pin_payment_amount?: number;
}

// Activate Card Response
export interface UqpayActivateCardResponse {
  request_status: 'SUCCESS' | 'FAILED';
}

// Assign Card Request
export interface UqpayAssignCardRequest {
  cardholder_id: string;
  card_number: string;
  card_currency: string;
  card_mode: UqpayModeType;
}

// Assign Card Response
export interface UqpayAssignCardResponse {
  card_id: string;
  card_order_id: string;
  create_time: string;
  card_status: UqpayCardStatus;
  order_status: UqpayOrderStatus;
}

// Reset Card PIN Request
export interface UqpayResetPinRequest {
  card_id: string;
  pin: string; // 6-digit numeric
}

// Reset Card PIN Response
export interface UqpayResetPinResponse {
  request_status: 'SUCCESS' | 'FAILED';
}

// ============ Transaction API 类型 ============

export type UqpayTransactionType =
  | 'AUTHORIZATION'
  | 'SETTLEMENT'
  | 'REFUND'
  | 'REVERSAL'
  | 'ATM'
  | 'FEE'
  | 'ADJUSTMENT';

export type UqpayTransactionStatus = 'PENDING' | 'COMPLETED' | 'DECLINED' | 'REVERSED';

// Merchant Data in Transaction
export interface UqpayMerchantData {
  category_code: string;
  city?: string;
  country?: string;
  name?: string;
}

// Transaction Item
export interface UqpayTransactionItem {
  card_id: string;
  card_number: string; // Masked: ************5668
  cardholder_id: string;
  transaction_id: string;
  short_transaction_id: string;
  original_transaction_id?: string;
  transaction_type: UqpayTransactionType;
  transaction_fee: number;
  transaction_fee_currency: string;
  fee_pass_through?: 'Y' | 'N';
  card_available_balance: number;
  authorization_code?: number;
  billing_amount: number;
  billing_currency: string;
  transaction_amount: number;
  transaction_currency: string;
  transaction_time: string; // ISO 8601: "2024-03-21T17:17:32+08:00"
  posted_time?: string;
  merchant_data?: UqpayMerchantData;
  description?: string;
  transaction_status: UqpayTransactionStatus;
  wallet_type?: string; // "ApplePay", etc.
}

// List Transactions Query Params
export interface UqpayListTransactionsParams {
  page_size?: number; // 10-100, default 10
  page_number?: number; // >= 1, default 1
  card_id?: string;
  start_time?: string; // Max 90 days interval
  end_time?: string;
}

// List Transactions Response
export interface UqpayListTransactionsResponse {
  total_pages: number;
  total_items: number;
  data: UqpayTransactionItem[];
}

// Retrieve Transaction Response (same as TransactionItem)
export type UqpayRetrieveTransactionResponse = UqpayTransactionItem;

// ============ Product API 类型 ============

export type UqpayProductStatus = 'ENABLED' | 'DISABLED';
export type UqpayCardForm = 'VIR' | 'PHY'; // Virtual or Physical

// No PIN Payment Amount
export interface UqpayNoPinPaymentAmount {
  amount: string;
  currency: string;
}

// Product Item
export interface UqpayProductItem {
  product_id: string;
  mode_type: UqpayModeType;
  card_bin: string;
  card_form: UqpayCardForm[];
  max_card_quota: number;
  card_scheme: UqpayCardScheme;
  no_pin_payment_amount?: UqpayNoPinPaymentAmount[];
  card_currency: string[];
  create_time: string;
  update_time: string;
  product_status: UqpayProductStatus;
}

// List Products Query Params
export interface UqpayListProductsParams {
  page_size?: number; // 10-100, default 10
  page_number?: number; // >= 1, default 1
}

// List Products Response
export interface UqpayListProductsResponse {
  total_pages: number;
  total_items: number;
  data: UqpayProductItem[];
}

// ============ Balance API 类型 ============

export type UqpayBalanceStatus = 'ACTIVE' | 'INACTIVE';

// Retrieve Balance Request (POST)
export interface UqpayRetrieveBalanceRequest {
  currency: string;
}

// Balance Item
export interface UqpayBalanceItem {
  balance_id: string;
  currency: string;
  available_balance: number;
  margin_balance: number;
  frozen_balance: number;
  create_time: string;
  last_trade_time?: string;
  balance_status: UqpayBalanceStatus;
}

// List Balances Query Params
export interface UqpayListBalancesParams {
  page_size?: number; // 10-100, default 10
  page_number?: number; // >= 1, default 1
}

// List Balances Response
export interface UqpayListBalancesResponse {
  total_pages: number;
  total_items: number;
  data: UqpayBalanceItem[];
}

// Balance Transaction Type
export type UqpayBalanceTransactionType =
  | 'DEPOSIT'
  | 'WITHDRAW'
  | 'CARD_LOAD'
  | 'CARD_UNLOAD'
  | 'FEE'
  | 'ADJUSTMENT';

export type UqpayBalanceTransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

// Balance Transaction Item
export interface UqpayBalanceTransactionItem {
  transaction_id: string;
  short_transaction_id: string;
  account_id: string;
  balance_id: string;
  transaction_type: UqpayBalanceTransactionType;
  currency: string;
  amount: number;
  create_time: string;
  complete_time?: string;
  transaction_status: UqpayBalanceTransactionStatus;
  ending_balance: number;
  description?: string;
}

// List Balance Transactions Query Params
export interface UqpayListBalanceTransactionsParams {
  page_size?: number; // 10-100, default 10
  page_number?: number; // >= 1, default 1
  start_time?: string; // Max 90 days interval
  end_time?: string;
}

// List Balance Transactions Response
export interface UqpayListBalanceTransactionsResponse {
  total_pages: number;
  total_items: number;
  data: UqpayBalanceTransactionItem[];
}

// ============ Transfer API 类型 ============

export type UqpayTransferStatus = 'pending' | 'completed' | 'failed';

// Create Transfer Request
export interface UqpayCreateTransferRequest {
  source_account_id: string;
  destination_account_id: string;
  currency: string;
  amount: number;
  remark?: string;
}

// Create Transfer Response
export interface UqpayCreateTransferResponse {
  transfer_id: string;
}

// Transfer Item (Retrieve)
export interface UqpayTransferItem {
  transfer_id: string;
  reference_id?: string;
  source_account_id: string;
  destination_account_id: string;
  amount: number;
  fee_amount?: number;
  currency: string;
  transfer_status: UqpayTransferStatus;
  create_time: string;
  complete_time?: string;
  creator_id?: string;
  remark?: string;
}

// ============ Error Response ============

export interface UqpayErrorResponse {
  error_code?: string;
  error_message?: string;
  message?: string;
  status?: number;
}
