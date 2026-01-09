import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUser } from '@database/entities/admin-user.entity';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(AdminUser)
    private adminUserRepository: Repository<AdminUser>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('adminJwt.secret'),
    });
  }

  async validate(payload: { sub: string; username: string; role: string }) {
    const admin = await this.adminUserRepository.findOne({
      where: { id: payload.sub },
    });

    if (!admin || admin.status !== 'active') {
      throw new UnauthorizedException('管理员不存在或已被禁用');
    }

    return admin;
  }
}
