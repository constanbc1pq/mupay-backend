import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class RechargeCardDto {
  @ApiProperty({ example: 100, description: '充值金额' })
  @IsNotEmpty({ message: '充值金额不能为空' })
  @IsNumber()
  @Min(10, { message: '最低充值金额为10' })
  amount: number;

  @ApiProperty({ example: '123456', description: '支付密码' })
  @IsNotEmpty({ message: '支付密码不能为空' })
  @IsString()
  paymentPassword: string;
}
