import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class SetPaymentPasswordDto {
  @ApiProperty({ example: '123456', description: '支付密码(6位数字)' })
  @IsNotEmpty({ message: '支付密码不能为空' })
  @IsString()
  @Length(6, 6, { message: '支付密码必须是6位' })
  @Matches(/^\d{6}$/, { message: '支付密码必须是6位数字' })
  password: string;
}

export class VerifyPaymentPasswordDto {
  @ApiProperty({ example: '123456', description: '支付密码' })
  @IsNotEmpty({ message: '支付密码不能为空' })
  @IsString()
  @Length(6, 6, { message: '支付密码必须是6位' })
  password: string;
}

export class UpdatePaymentPasswordDto {
  @ApiProperty({ example: '123456', description: '原支付密码' })
  @IsNotEmpty({ message: '原支付密码不能为空' })
  @IsString()
  @Length(6, 6, { message: '支付密码必须是6位' })
  oldPassword: string;

  @ApiProperty({ example: '654321', description: '新支付密码' })
  @IsNotEmpty({ message: '新支付密码不能为空' })
  @IsString()
  @Length(6, 6, { message: '支付密码必须是6位' })
  @Matches(/^\d{6}$/, { message: '支付密码必须是6位数字' })
  newPassword: string;
}
