import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class Enable2FADto {
  @ApiProperty({ description: 'TOTP验证码' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;
}

export class Verify2FADto {
  @ApiProperty({ description: 'TOTP验证码' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;
}

export class Disable2FADto {
  @ApiProperty({ description: 'TOTP验证码' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;
}

export class TwoFactorSecretResponseDto {
  @ApiProperty({ description: '密钥' })
  secret: string;

  @ApiProperty({ description: '二维码URL (otpauth://)' })
  otpauthUrl: string;

  @ApiProperty({ description: '二维码图片 (base64)' })
  qrCode: string;
}

export class DeviceInfoDto {
  @ApiProperty({ description: '设备ID' })
  id: string;

  @ApiPropertyOptional({ description: '设备名称' })
  deviceName?: string;

  @ApiPropertyOptional({ description: '设备类型' })
  deviceType?: string;

  @ApiPropertyOptional({ description: '操作系统' })
  os?: string;

  @ApiPropertyOptional({ description: '浏览器' })
  browser?: string;

  @ApiPropertyOptional({ description: 'IP地址' })
  ip?: string;

  @ApiPropertyOptional({ description: '位置' })
  location?: string;

  @ApiPropertyOptional({ description: '最后活跃时间' })
  lastActiveAt?: Date;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;
}

export class LoginHistoryDto {
  @ApiProperty({ description: 'ID' })
  id: string;

  @ApiPropertyOptional({ description: 'IP地址' })
  ip?: string;

  @ApiPropertyOptional({ description: '设备信息' })
  device?: string;

  @ApiPropertyOptional({ description: '位置' })
  location?: string;

  @ApiProperty({ description: '状态' })
  status: string;

  @ApiPropertyOptional({ description: '失败原因' })
  failReason?: string;

  @ApiProperty({ description: '时间' })
  createdAt: Date;
}
