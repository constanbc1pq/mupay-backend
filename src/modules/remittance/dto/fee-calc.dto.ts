import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsIn, Min } from 'class-validator';

export class FeeCalcDto {
  @ApiProperty({ example: 1000, description: '金额' })
  @IsNotEmpty({ message: '金额不能为空' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'bank', description: '类型: bank/usdt' })
  @IsNotEmpty({ message: '类型不能为空' })
  @IsString()
  @IsIn(['bank', 'usdt'], { message: '无效的类型' })
  type: string;
}
