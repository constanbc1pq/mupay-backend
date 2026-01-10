import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional, IsNumber, Min } from 'class-validator';

/**
 * 申请卡片 DTO (V2 - 基于服务商/产品)
 */
export class ApplyCardV2Dto {
  @ApiProperty({ example: 'uuid', description: '服务商ID' })
  @IsNotEmpty({ message: '服务商ID不能为空' })
  @IsUUID()
  providerId: string;

  @ApiProperty({ example: 'uuid', description: '卡产品ID' })
  @IsNotEmpty({ message: '卡产品ID不能为空' })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ example: 100, description: '首次充值金额 (可选)' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: '充值金额不能为负数' })
  initialBalance?: number;

  @ApiPropertyOptional({ example: 'USD', description: '货币代码 (不传则使用产品默认)' })
  @IsOptional()
  @IsString()
  currency?: string;
}
