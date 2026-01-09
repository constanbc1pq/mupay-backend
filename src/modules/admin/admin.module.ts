import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminUser } from '@database/entities/admin-user.entity';
import { User } from '@database/entities/user.entity';
import { Transaction } from '@database/entities/transaction.entity';
import { Agent } from '@database/entities/agent.entity';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('adminJwt.secret'),
        signOptions: {
          expiresIn: configService.get('adminJwt.accessTokenExpiry'),
        },
      }),
    }),
    TypeOrmModule.forFeature([AdminUser, User, Transaction, Agent]),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminJwtStrategy],
  exports: [AdminService],
})
export class AdminModule {}
