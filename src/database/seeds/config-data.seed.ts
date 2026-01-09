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
      { code: 'CN', name: '中国大陆', flag: '🇨🇳', currency: 'CNY', sortOrder: 1 },
      { code: 'HK', name: '中国香港', flag: '🇭🇰', currency: 'HKD', sortOrder: 2 },
      { code: 'US', name: '美国', flag: '🇺🇸', currency: 'USD', sortOrder: 3 },
      { code: 'JP', name: '日本', flag: '🇯🇵', currency: 'JPY', sortOrder: 4 },
      { code: 'SG', name: '新加坡', flag: '🇸🇬', currency: 'SGD', sortOrder: 5 },
      { code: 'TH', name: '泰国', flag: '🇹🇭', currency: 'THB', sortOrder: 6 },
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
      { code: 'ICBC', name: '中国工商银行', countryCode: 'CN', sortOrder: 1 },
      { code: 'CCB', name: '中国建设银行', countryCode: 'CN', sortOrder: 2 },
      { code: 'ABC', name: '中国农业银行', countryCode: 'CN', sortOrder: 3 },
      { code: 'BOC', name: '中国银行', countryCode: 'CN', sortOrder: 4 },
      { code: 'CMB', name: '招商银行', countryCode: 'CN', sortOrder: 5 },
      { code: 'CITIC', name: '中信银行', countryCode: 'CN', sortOrder: 6 },
      // Hong Kong
      { code: 'HSBC', name: '汇丰银行', countryCode: 'HK', sortOrder: 1 },
      { code: 'SCB', name: '渣打银行', countryCode: 'HK', sortOrder: 2 },
      { code: 'BOCHK', name: '中银香港', countryCode: 'HK', sortOrder: 3 },
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
      { code: 'CMCC', name: '中国移动', countryCode: 'CN' },
      { code: 'CUCC', name: '中国联通', countryCode: 'CN' },
      { code: 'CTCC', name: '中国电信', countryCode: 'CN' },
    ];

    await operatorRepository.save(operators);
    console.log('Mobile operators seeded');
  }
}
