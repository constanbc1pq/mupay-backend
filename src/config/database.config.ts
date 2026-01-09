import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const isDev = configService.get('nodeEnv') === 'development';

  return {
    type: 'mysql',
    host: configService.get('database.host'),
    port: configService.get('database.port'),
    username: configService.get('database.username'),
    password: configService.get('database.password'),
    database: configService.get('database.database'),
    entities: [__dirname + '/../database/entities/*.entity{.ts,.js}'],
    synchronize: isDev, // Auto sync in development only
    logging: isDev ? ['query', 'error'] : ['error'],
    charset: 'utf8mb4',
    timezone: '+08:00',
  };
};
