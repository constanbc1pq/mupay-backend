import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsIn, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 卡交易列表查询 DTO
 */
export class ListTransactionsDto {
  @ApiPropertyOptional({ example: 1, description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({
    example: 'purchase',
    description: '交易类型: authorization/purchase/refund/reversal/atm/fee/adjustment',
  })
  @IsOptional()
  @IsString()
  @IsIn(['authorization', 'purchase', 'refund', 'reversal', 'atm', 'fee', 'adjustment'])
  type?: string;

  @ApiPropertyOptional({
    example: 'completed',
    description: '交易状态: pending/completed/declined/reversed',
  })
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'completed', 'declined', 'reversed'])
  status?: string;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00Z', description: '开始时间 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59Z', description: '结束时间 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endTime?: string;
}
