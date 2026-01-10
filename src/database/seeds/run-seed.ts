import { DataSource } from 'typeorm';
import { seedAdmin } from './admin.seed';
import { seedConfigData } from './config-data.seed';
import { seedFaq } from './faq.seed';
import { seedMessageTemplates } from './message-template.seed';

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3315', 10),
  username: process.env.DB_USERNAME || 'mupay',
  password: process.env.DB_PASSWORD || 'mupay_123',
  database: process.env.DB_DATABASE || 'mupay',
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  synchronize: true,
});

async function runSeeds() {
  try {
    await dataSource.initialize();
    console.log('Database connected');

    await seedAdmin(dataSource);
    await seedConfigData(dataSource);
    await seedFaq(dataSource);
    await seedMessageTemplates(dataSource);

    console.log('All seeds completed');
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await dataSource.destroy();
  }
}

runSeeds();
