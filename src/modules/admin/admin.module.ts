import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminDepositController } from './admin-deposit.controller';
import { AdminIssuingController } from './admin-issuing.controller';
import { AdminKycController } from './admin-kyc.controller';
import { AdminCardholderController } from './admin-cardholder.controller';
import { AdminFinanceController } from './admin-finance.controller';
import { AdminService } from './admin.service';
import { AdminDepositService } from './admin-deposit.service';
import { AdminIssuingService } from './admin-issuing.service';
import { AdminCardholderService } from './admin-cardholder.service';
import { AdminFinanceService } from './admin-finance.service';
import { KycModule } from '../kyc/kyc.module';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminUser } from '@database/entities/admin-user.entity';
import { User } from '@database/entities/user.entity';
import { Transaction } from '@database/entities/transaction.entity';
import { Agent } from '@database/entities/agent.entity';
import { DepositOrder } from '@database/entities/deposit-order.entity';
import { DepositAddress } from '@database/entities/deposit-address.entity';
import { DepositAuditLog } from '@database/entities/deposit-audit-log.entity';
import { Wallet } from '@database/entities/wallet.entity';
import { CardProvider } from '@database/entities/card-provider.entity';
import { CardProduct } from '@database/entities/card-product.entity';
import { Card } from '@database/entities/card.entity';
import { Cardholder } from '@database/entities/cardholder.entity';
import { KycRecord } from '@database/entities/kyc-record.entity';
import { IssuingBalance } from '@database/entities/issuing-balance.entity';
import { IssuingBalanceTransaction } from '@database/entities/issuing-balance-transaction.entity';
import { UsdtWithdraw } from '@database/entities/usdt-withdraw.entity';
import { Transfer } from '@database/entities/transfer.entity';

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
    KycModule,
    TypeOrmModule.forFeature([
      AdminUser,
      User,
      Transaction,
      Agent,
      DepositOrder,
      DepositAddress,
      DepositAuditLog,
      Wallet,
      CardProvider,
      CardProduct,
      Card,
      Cardholder,
      KycRecord,
      IssuingBalance,
      IssuingBalanceTransaction,
      UsdtWithdraw,
      Transfer,
    ]),
  ],
  controllers: [AdminController, AdminDepositController, AdminIssuingController, AdminKycController, AdminCardholderController, AdminFinanceController],
  providers: [AdminService, AdminDepositService, AdminIssuingService, AdminCardholderService, AdminFinanceService, AdminJwtStrategy],
  exports: [AdminService],
})
export class AdminModule {}
