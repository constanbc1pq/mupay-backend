import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepositNotificationService } from './deposit-notification.service';
import { DepositAuditService } from './deposit-audit.service';
import { DepositAuditLog } from '@database/entities/deposit-audit-log.entity';
import { UserNotification } from '@database/entities/user-notification.entity';
import { User } from '@database/entities/user.entity';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([DepositAuditLog, UserNotification, User]),
  ],
  providers: [DepositNotificationService, DepositAuditService],
  exports: [DepositNotificationService, DepositAuditService],
})
export class NotificationModule {}
