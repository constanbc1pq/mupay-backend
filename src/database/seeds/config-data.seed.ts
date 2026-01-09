import { DataSource } from 'typeorm';
import { Country } from '../entities/country.entity';
import { Bank } from '../entities/bank.entity';
import { ExchangeRate } from '../entities/exchange-rate.entity';
import { MobileOperator } from '../entities/mobile-operator.entity';

export async function seedConfigData(dataSource: DataSource) {
  // Seed Countries
  const countryRepository = dataSource.getRepository(Country);
  const existingCountries = await countryRepository.count();

  if (existingCountries === 0) {
    const countries = [
      { code: 'CN', name: 'China', flag: '🇨🇳', currency: 'CNY', sortOrder: 1 },
      { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', currency: 'HKD', sortOrder: 2 },
      { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', sortOrder: 3 },
      { code: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'JPY', sortOrder: 4 },
      { code: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'SGD', sortOrder: 5 },
      { code: 'TH', name: 'Thailand', flag: '🇹🇭', currency: 'THB', sortOrder: 6 },
    ];

    await countryRepository.save(countries);
    console.log('Countries seeded');
  }

  // Seed Banks
  const bankRepository = dataSource.getRepository(Bank);
  const existingBanks = await bankRepository.count();

  if (existingBanks === 0) {
    const banks = [
      // China
      { code: 'ICBC', name: 'Industrial and Commercial Bank of China', countryCode: 'CN', sortOrder: 1 },
      { code: 'CCB', name: 'China Construction Bank', countryCode: 'CN', sortOrder: 2 },
      { code: 'ABC', name: 'Agricultural Bank of China', countryCode: 'CN', sortOrder: 3 },
      { code: 'BOC', name: 'Bank of China', countryCode: 'CN', sortOrder: 4 },
      { code: 'CMB', name: 'China Merchants Bank', countryCode: 'CN', sortOrder: 5 },
      { code: 'CITIC', name: 'CITIC Bank', countryCode: 'CN', sortOrder: 6 },
      // Hong Kong
      { code: 'HSBC', name: 'HSBC', countryCode: 'HK', sortOrder: 1 },
      { code: 'SCB', name: 'Standard Chartered', countryCode: 'HK', sortOrder: 2 },
      { code: 'BOCHK', name: 'Bank of China (Hong Kong)', countryCode: 'HK', sortOrder: 3 },
    ];

    await bankRepository.save(banks);
    console.log('Banks seeded');
  }

  // Seed Exchange Rates
  const rateRepository = dataSource.getRepository(ExchangeRate);
  const existingRates = await rateRepository.count();

  if (existingRates === 0) {
    const rates = [
      { pair: 'USDT_CNY', rate: 7.18 },
      { pair: 'USDT_HKD', rate: 7.78 },
      { pair: 'USDT_USD', rate: 1.0 },
      { pair: 'USDT_JPY', rate: 149.5 },
      { pair: 'USDT_SGD', rate: 1.34 },
      { pair: 'USDT_THB', rate: 35.2 },
    ];

    await rateRepository.save(rates);
    console.log('Exchange rates seeded');
  }

  // Seed Mobile Operators
  const operatorRepository = dataSource.getRepository(MobileOperator);
  const existingOperators = await operatorRepository.count();

  if (existingOperators === 0) {
    const operators = [
      { code: 'CMCC', name: 'China Mobile', countryCode: 'CN' },
      { code: 'CUCC', name: 'China Unicom', countryCode: 'CN' },
      { code: 'CTCC', name: 'China Telecom', countryCode: 'CN' },
    ];

    await operatorRepository.save(operators);
    console.log('Mobile operators seeded');
  }
}
