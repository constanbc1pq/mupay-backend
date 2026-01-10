import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserNotification } from '@database/entities/user-notification.entity';
import { MessageTemplate } from '@database/entities/message-template.entity';
import { User } from '@database/entities/user.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([UserNotification, MessageTemplate, User]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
