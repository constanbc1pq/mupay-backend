import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '@common/dto/api-response.dto';
import { DepositMethod, DepositStatus, NetworkType } from '@database/entities/deposit-order.entity';

export class AdminDepositQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '用户ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '订单号' })
  @IsOptional()
  @IsString()
  orderNo?: string;

  @ApiPropertyOptional({ enum: ['CRYPTO', 'CARD', 'PAYPAL'], description: '充值方式' })
  @IsOptional()
  @IsEnum(['CRYPTO', 'CARD', 'PAYPAL'])
  method?: DepositMethod;

  @ApiPropertyOptional({ enum: ['ERC20', 'BEP20', 'TRC20'], description: '网络类型' })
  @IsOptional()
  @IsEnum(['ERC20', 'BEP20', 'TRC20'])
  network?: NetworkType;

  @ApiPropertyOptional({ enum: ['PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'], description: '状态' })
  @IsOptional()
  @IsEnum(['PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'])
  status?: DepositStatus;

  @ApiPropertyOptional({ description: '开始日期' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ManualConfirmDto {
  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class AdminAuditLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '订单ID' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: '操作类型' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: '开始日期' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
