import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class BankRemittanceDto {
  @ApiProperty({ example: 'CN', description: '国家代码' })
  @IsNotEmpty({ message: '国家代码不能为空' })
  @IsString()
  countryCode: string;

  @ApiProperty({ example: 'ICBC', description: '银行代码' })
  @IsNotEmpty({ message: '银行代码不能为空' })
  @IsString()
  bankCode: string;

  @ApiProperty({ example: '张三', description: '收款人姓名' })
  @IsNotEmpty({ message: '收款人姓名不能为空' })
  @IsString()
  accountName: string;

  @ApiProperty({ example: '6222021234567890', description: '银行卡号' })
  @IsNotEmpty({ message: '银行卡号不能为空' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ example: 1000, description: '汇款金额(USDT)' })
  @IsNotEmpty({ message: '汇款金额不能为空' })
  @IsNumber()
  @Min(10, { message: '最低汇款金额为10' })
  amount: number;

  @ApiProperty({ example: 'CNY', description: '目标币种', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: '123456', description: '支付密码' })
  @IsNotEmpty({ message: '支付密码不能为空' })
  @IsString()
  paymentPassword: string;
}
