import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@database/entities/user.entity';
import { UserDevice } from '@database/entities/user-device.entity';
import { LoginHistory } from '@database/entities/login-history.entity';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserDevice, LoginHistory])],
  controllers: [SecurityController],
  providers: [SecurityService],
  exports: [SecurityService],
})
export class SecurityModule {}
