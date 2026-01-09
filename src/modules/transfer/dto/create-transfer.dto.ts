import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateTransferDto {
  @ApiProperty({ description: '目标用户ID' })
  @IsNotEmpty({ message: '目标用户ID不能为空' })
  @IsString()
  toUserId: string;

  @ApiProperty({ example: 100, description: '转账金额' })
  @IsNotEmpty({ message: '转账金额不能为空' })
  @IsNumber()
  @Min(1, { message: '最低转账金额为1' })
  amount: number;

  @ApiProperty({ example: '还款', description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ example: '123456', description: '支付密码' })
  @IsNotEmpty({ message: '支付密码不能为空' })
  @IsString()
  paymentPassword: string;
}
