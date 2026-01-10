import { DataSource } from 'typeorm';
import { CardProvider, CardProviderStatus } from '../entities/card-provider.entity';
import { CardProduct, CardProductStatus, CardForm, CardMode, CardBrand } from '../entities/card-product.entity';
import { AgentPolicy, AgentPolicyStatus } from '../entities/agent-policy.entity';

export async function seedCardProviders(dataSource: DataSource) {
  const providerRepository = dataSource.getRepository(CardProvider);
  const productRepository = dataSource.getRepository(CardProduct);
  const policyRepository = dataSource.getRepository(AgentPolicy);

  // Check if UQPAY provider already exists
  let uqpayProvider = await providerRepository.findOne({
    where: { code: 'uqpay' },
  });

  const providerData = {
    code: 'uqpay',
    name: 'UQPAY',
    description: 'Virtual card provider supporting Visa/Mastercard',
    status: CardProviderStatus.ACTIVE,
    apiBaseUrl: process.env.UQPAY_API_BASE_URL || 'https://sandbox-api.uqpay.com',
    apiKey: process.env.UQPAY_API_KEY || 'test-api-key',
    apiSecret: process.env.UQPAY_API_SECRET || 'test-api-secret',
    webhookSecret: process.env.UQPAY_WEBHOOK_SECRET || 'test-webhook-secret',
    timeout: 30000,
    openFeeRate: 0.02,
    rechargeFeeRate: 0.018,
    withdrawFeeRate: 0.01,
    monthlyFeeRate: 0,
    minRecharge: 10,
    maxRecharge: 10000,
    minWithdraw: 10,
    maxWithdraw: 5000,
    supportedCardForms: ['virtual'],
    supportedCardModes: ['single'],
    supportedCurrencies: ['USD'],
    priority: 1,
    weight: 100,
    isHealthy: true,
    failureCount: 0,
  };

  if (!uqpayProvider) {
    uqpayProvider = providerRepository.create(providerData);
    await providerRepository.save(uqpayProvider);
    console.log('UQPAY provider created');
  } else {
    // Update existing provider
    Object.assign(uqpayProvider, providerData);
    await providerRepository.save(uqpayProvider);
    console.log('UQPAY provider updated');
  }

  // ============ Seed UQPAY Products ============

  // Product 1: UQPAY Shared Virtual Card (VISA)
  const product1Id = 'c0cef051-29c5-4796-b86a-cd5b684bfad7';
  let product1 = await productRepository.findOne({
    where: { providerProductId: product1Id },
  });

  const product1Data = {
    providerId: uqpayProvider.id,
    providerProductId: product1Id,
    name: 'UQPAY Shared Card',
    description: 'Shared virtual card with low fees, suitable for online payments',
    cardForm: CardForm.VIRTUAL,
    cardMode: CardMode.SHARED,
    cardBrand: CardBrand.VISA,
    cardBin: '40963608',
    currencies: ['USD', 'SGD'],
    openFee: 5,
    monthlyFee: 0,
    rechargeRate: 0.018,
    withdrawRate: 0.01,
    minDeposit: 10,
    maxDeposit: 5000,
    dailyLimit: 2000,
    monthlyLimit: 10000,
    maxCardQuota: 100,
    features: ['online_payment', 'instant_activation', 'multi_currency'],
    requiredKycLevel: 1,
    status: CardProductStatus.ACTIVE,
    sortOrder: 1,
    isVisible: true,
  };

  if (!product1) {
    product1 = productRepository.create(product1Data);
    await productRepository.save(product1);
    console.log('UQPAY Shared Card product created');
  } else {
    Object.assign(product1, product1Data);
    await productRepository.save(product1);
    console.log('UQPAY Shared Card product updated');
  }

  // Product 2: UQPAY Single Virtual Card (VISA)
  const product2Id = 'd1def162-3ad6-5897-c97b-de6c795cfbe8';
  let product2 = await productRepository.findOne({
    where: { providerProductId: product2Id },
  });

  const product2Data = {
    providerId: uqpayProvider.id,
    providerProductId: product2Id,
    name: 'UQPAY Premium Card',
    description: 'Dedicated virtual card with higher limits for business use',
    cardForm: CardForm.VIRTUAL,
    cardMode: CardMode.SINGLE,
    cardBrand: CardBrand.VISA,
    cardBin: '40963609',
    currencies: ['USD'],
    openFee: 10,
    monthlyFee: 2,
    rechargeRate: 0.015,
    withdrawRate: 0.01,
    minDeposit: 50,
    maxDeposit: 10000,
    dailyLimit: 5000,
    monthlyLimit: 50000,
    maxCardQuota: 50,
    features: ['online_payment', 'instant_activation', 'dedicated_bin', 'higher_limit'],
    requiredKycLevel: 2,
    status: CardProductStatus.ACTIVE,
    sortOrder: 2,
    isVisible: true,
  };

  if (!product2) {
    product2 = productRepository.create(product2Data);
    await productRepository.save(product2);
    console.log('UQPAY Premium Card product created');
  } else {
    Object.assign(product2, product2Data);
    await productRepository.save(product2);
    console.log('UQPAY Premium Card product updated');
  }

  // ============ Seed Agent Policy ============

  // Create default agent policy for UQPAY
  const existingPolicy = await policyRepository.findOne({
    where: { providerId: uqpayProvider.id },
  });

  const policyData = {
    providerId: uqpayProvider.id,
    name: 'UQPAY Standard Agent Policy',
    description: 'Default agent commission policy for UQPAY provider',
    cardOpenCommissionRate: 0.05,
    monthlyFeeCommissionRate: 0.10,
    rechargeCommissionRate: 0.02,
    transactionCommissionRate: 0.01,
    level1Rate: 1.0,
    level2Rate: 0.1,
    minPayout: 10,
    status: AgentPolicyStatus.ACTIVE,
  };

  if (!existingPolicy) {
    const policy = policyRepository.create(policyData);
    await policyRepository.save(policy);
    console.log('UQPAY agent policy created');
  } else {
    Object.assign(existingPolicy, policyData);
    await policyRepository.save(existingPolicy);
    console.log('UQPAY agent policy updated');
  }
}
