import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, Matches } from 'class-validator';

export class CreateTopupDto {
  @ApiProperty({ example: 'CMCC', description: '运营商代码' })
  @IsNotEmpty({ message: '运营商不能为空' })
  @IsString()
  operatorCode: string;

  @ApiProperty({ example: '13800138000', description: '手机号' })
  @IsNotEmpty({ message: '手机号不能为空' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phoneNumber: string;

  @ApiProperty({ example: 100, description: '充值金额' })
  @IsNotEmpty({ message: '充值金额不能为空' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: '123456', description: '支付密码' })
  @IsNotEmpty({ message: '支付密码不能为空' })
  @IsString()
  paymentPassword: string;
}
