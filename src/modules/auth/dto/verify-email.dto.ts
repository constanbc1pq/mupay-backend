import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail, Length } from 'class-validator';

export class SendVerifyEmailDto {
  @ApiProperty({ example: 'test@example.com', description: '邮箱' })
  @IsNotEmpty({ message: 'MSG_1020' })
  @IsEmail({}, { message: 'MSG_1021' })
  email: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'test@example.com', description: '邮箱' })
  @IsNotEmpty({ message: 'MSG_1020' })
  @IsEmail({}, { message: 'MSG_1021' })
  email: string;

  @ApiProperty({ example: '123456', description: '验证码' })
  @IsNotEmpty({ message: 'MSG_1025' }) // 验证码不能为空
  @IsString()
  @Length(6, 6, { message: 'MSG_1026' }) // 验证码必须是6位
  code: string;
}
