import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class SendEmailBindCodeDto {
  @ApiProperty({ description: '要绑定的邮箱地址' })
  @IsEmail()
  email: string;
}

export class BindEmailDto {
  @ApiProperty({ description: '要绑定的邮箱地址' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '验证码' })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class SendEmailChangeCodeDto {
  @ApiProperty({ description: '新邮箱地址' })
  @IsEmail()
  newEmail: string;
}

export class ChangeEmailDto {
  @ApiProperty({ description: '新邮箱地址' })
  @IsEmail()
  newEmail: string;

  @ApiProperty({ description: '验证码' })
  @IsString()
  @Length(6, 6)
  code: string;
}
