import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, Min, IsIn } from 'class-validator';

export class UsdtWithdrawDto {
  @ApiProperty({ example: 'TRC20', description: '网络类型: TRC20/ERC20/BEP20' })
  @IsNotEmpty({ message: '网络类型不能为空' })
  @IsString()
  @IsIn(['TRC20', 'ERC20', 'BEP20'], { message: '无效的网络类型' })
  network: string;

  @ApiProperty({ example: 'TXyz...', description: '钱包地址' })
  @IsNotEmpty({ message: '钱包地址不能为空' })
  @IsString()
  address: string;

  @ApiProperty({ example: 100, description: '提取金额(USDT)' })
  @IsNotEmpty({ message: '提取金额不能为空' })
  @IsNumber()
  @Min(10, { message: '最低提取金额为10' })
  amount: number;

  @ApiProperty({ example: '123456', description: '支付密码' })
  @IsNotEmpty({ message: '支付密码不能为空' })
  @IsString()
  paymentPassword: string;
}
