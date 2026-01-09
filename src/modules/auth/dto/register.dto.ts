import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEmail,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'test@example.com', description: '邮箱' })
  @IsNotEmpty({ message: 'MSG_1020' }) // 邮箱不能为空
  @IsEmail({}, { message: 'MSG_1021' }) // 邮箱格式不正确
  email: string;

  @ApiProperty({ example: '123456', description: '密码' })
  @IsNotEmpty({ message: 'MSG_1022' }) // 密码不能为空
  @IsString()
  @MinLength(6, { message: 'MSG_1023' }) // 密码长度不能少于6位
  @MaxLength(20, { message: 'MSG_1024' }) // 密码长度不能超过20位
  password: string;

  @ApiProperty({ example: '13800138000', description: '手机号', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}
