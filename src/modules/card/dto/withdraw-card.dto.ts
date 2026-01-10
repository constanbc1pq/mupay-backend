import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, Min } from 'class-validator';

/**
 * 卡余额提现到钱包 DTO
 */
export class WithdrawCardDto {
  @ApiProperty({ example: 50, description: '提现金额' })
  @IsNotEmpty({ message: '提现金额不能为空' })
  @IsNumber()
  @Min(1, { message: '最低提现金额为1' })
  amount: number;

  @ApiProperty({ example: '123456', description: '支付密码' })
  @IsNotEmpty({ message: '支付密码不能为空' })
  @IsString()
  paymentPassword: string;

  @ApiPropertyOptional({ example: '提现到钱包', description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}
