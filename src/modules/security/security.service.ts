import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { User } from '@database/entities/user.entity';
import { UserDevice } from '@database/entities/user-device.entity';
import { LoginHistory, LoginStatus } from '@database/entities/login-history.entity';
import { MSG } from '@common/constants/messages';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserDevice)
    private deviceRepository: Repository<UserDevice>,
    @InjectRepository(LoginHistory)
    private loginHistoryRepository: Repository<LoginHistory>,
    private configService: ConfigService,
  ) {}

  // ==================== 2FA ====================

  async generate2FASecret(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException(MSG.USER_2FA_ALREADY_ENABLED);
    }

    // Generate a 20-byte base32 secret
    const secret = this.generateBase32Secret(20);
    const issuer = 'MuPay';
    const accountName = user.email || user.username;

    // Store secret temporarily (will be confirmed when user enables 2FA)
    user.twoFactorSecret = secret;
    await this.userRepository.save(user);

    const otpauthUrl = `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    return {
      secret,
      otpauthUrl,
      qrCode: otpauthUrl, // Frontend can use a QR library to render this
    };
  }

  async enable2FA(userId: string, code: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException(MSG.USER_2FA_ALREADY_ENABLED);
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException(MSG.INVALID_PARAMS);
    }

    // Verify the code
    const isValid = this.verifyTOTP(user.twoFactorSecret, code);
    if (!isValid) {
      throw new BadRequestException(MSG.USER_2FA_INVALID_CODE);
    }

    user.twoFactorEnabled = true;
    await this.userRepository.save(user);

    return { messageId: MSG.USER_2FA_ENABLED };
  }

  async disable2FA(userId: string, code: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException(MSG.USER_2FA_NOT_ENABLED);
    }

    // Verify the code
    const isValid = this.verifyTOTP(user.twoFactorSecret, code);
    if (!isValid) {
      throw new BadRequestException(MSG.USER_2FA_INVALID_CODE);
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null as any;
    await this.userRepository.save(user);

    return { messageId: MSG.USER_2FA_DISABLED };
  }

  async verify2FA(userId: string, code: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException(MSG.USER_2FA_NOT_ENABLED);
    }

    const isValid = this.verifyTOTP(user.twoFactorSecret, code);
    if (!isValid) {
      throw new BadRequestException(MSG.USER_2FA_INVALID_CODE);
    }

    return true;
  }

  async get2FAStatus(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(MSG.USER_NOT_FOUND);
    }

    return {
      enabled: user.twoFactorEnabled,
    };
  }

  // Simple TOTP implementation (without external library)
  private generateBase32Secret(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      secret += chars[bytes[i] % 32];
    }
    return secret;
  }

  private base32Decode(base32: string): Buffer {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const char of base32.toUpperCase()) {
      const val = chars.indexOf(char);
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }
    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substr(i, 8), 2));
    }
    return Buffer.from(bytes);
  }

  private verifyTOTP(secret: string, code: string, window: number = 1): boolean {
    const key = this.base32Decode(secret);
    const now = Math.floor(Date.now() / 1000 / 30);

    for (let i = -window; i <= window; i++) {
      const counter = now + i;
      const counterBuffer = Buffer.alloc(8);
      counterBuffer.writeBigUInt64BE(BigInt(counter));

      const hmac = crypto.createHmac('sha1', key);
      hmac.update(counterBuffer);
      const hash = hmac.digest();

      const offset = hash[hash.length - 1] & 0xf;
      const binary =
        ((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff);

      const otp = (binary % 1000000).toString().padStart(6, '0');

      if (otp === code) {
        return true;
      }
    }

    return false;
  }

  // ==================== Device Management ====================

  async getDevices(userId: string) {
    const devices = await this.deviceRepository.find({
      where: { userId },
      order: { lastActiveAt: 'DESC' },
    });

    return devices.map(d => ({
      id: d.id,
      deviceName: d.deviceName,
      deviceType: d.deviceType,
      os: d.os,
      browser: d.browser,
      ip: d.ip,
      location: d.location,
      lastActiveAt: d.lastActiveAt,
      createdAt: d.createdAt,
    }));
  }

  async removeDevice(userId: string, deviceId: string) {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new NotFoundException(MSG.USER_DEVICE_NOT_FOUND);
    }

    await this.deviceRepository.remove(device);

    return { messageId: MSG.USER_DEVICE_REMOVED };
  }

  async registerDevice(
    userId: string,
    deviceInfo: {
      deviceId: string;
      deviceName?: string;
      deviceType?: string;
      os?: string;
      browser?: string;
      ip?: string;
      location?: string;
    },
  ) {
    let device = await this.deviceRepository.findOne({
      where: { userId, deviceId: deviceInfo.deviceId },
    });

    if (device) {
      // Update existing device
      device.deviceName = deviceInfo.deviceName || device.deviceName;
      device.deviceType = deviceInfo.deviceType || device.deviceType;
      device.os = deviceInfo.os || device.os;
      device.browser = deviceInfo.browser || device.browser;
      device.ip = deviceInfo.ip || device.ip;
      device.location = deviceInfo.location || device.location;
      device.lastActiveAt = new Date();
    } else {
      // Create new device
      device = this.deviceRepository.create({
        userId,
        ...deviceInfo,
        lastActiveAt: new Date(),
      });
    }

    await this.deviceRepository.save(device);
    return device;
  }

  // ==================== Login History ====================

  async getLoginHistory(userId: string, page: number = 1, limit: number = 20) {
    const [records, total] = await this.loginHistoryRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: records.map(r => ({
        id: r.id,
        ip: r.ip,
        device: r.device,
        location: r.location,
        status: r.status,
        failReason: r.failReason,
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async recordLogin(
    userId: string,
    status: LoginStatus,
    info: {
      ip?: string;
      device?: string;
      location?: string;
      failReason?: string;
    },
  ) {
    const record = this.loginHistoryRepository.create({
      userId,
      status,
      ip: info.ip,
      device: info.device,
      location: info.location,
      failReason: info.failReason,
    });

    await this.loginHistoryRepository.save(record);
    return record;
  }
}
