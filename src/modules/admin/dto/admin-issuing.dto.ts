import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsIn,
  Min,
  Max,
  IsDecimal,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 服务商列表查询 DTO
 */
export class AdminProviderQueryDto {
  @ApiPropertyOptional({ example: 1, description: '页码' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: '每页数量' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ example: 'active', description: '状态筛选' })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'suspended'])
  status?: string;
}

/**
 * 更新服务商配置 DTO
 */
export class UpdateProviderDto {
  @ApiPropertyOptional({ example: 'UQPAY', description: '服务商名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'active', description: '状态' })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'suspended'])
  status?: string;

  @ApiPropertyOptional({ example: 'https://api.uqpay.com', description: 'API 地址' })
  @IsOptional()
  @IsString()
  apiBaseUrl?: string;

  @ApiPropertyOptional({ example: 'new-api-key', description: 'API Key' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ example: 'new-api-secret', description: 'API Secret' })
  @IsOptional()
  @IsString()
  apiSecret?: string;

  @ApiPropertyOptional({ example: 'webhook-secret', description: 'Webhook Secret' })
  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @ApiPropertyOptional({ example: 0.01, description: '开卡费率' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  openFeeRate?: number;

  @ApiPropertyOptional({ example: 0.018, description: '充值费率' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  rechargeFeeRate?: number;

  @ApiPropertyOptional({ example: 0.005, description: '提现费率' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  withdrawFeeRate?: number;

  @ApiPropertyOptional({ example: 10, description: '最小充值金额' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minRecharge?: number;

  @ApiPropertyOptional({ example: 10000, description: '最大充值金额' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxRecharge?: number;

  @ApiPropertyOptional({ example: 100, description: '优先级' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ example: true, description: '是否健康' })
  @IsOptional()
  @IsBoolean()
  isHealthy?: boolean;
}

/**
 * 发行余额列表查询 DTO
 */
export class AdminBalanceQueryDto {
  @ApiPropertyOptional({ example: 'uuid', description: '服务商ID' })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiPropertyOptional({ example: 'USD', description: '货币筛选' })
  @IsOptional()
  @IsString()
  currency?: string;
}

/**
 * 余额交易列表查询 DTO
 */
export class AdminBalanceTransactionQueryDto {
  @ApiPropertyOptional({ example: 1, description: '页码' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: '每页数量' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ example: 'USD', description: '货币筛选' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'card_load', description: '交易类型' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: '2024-01-01', description: '开始日期' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31', description: '结束日期' })
  @IsOptional()
  @IsString()
  endDate?: string;
}

/**
 * 更新余额预警配置 DTO
 */
export class UpdateBalanceAlertDto {
  @ApiPropertyOptional({ example: 1000, description: '预警阈值' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  alertThreshold?: number;

  @ApiPropertyOptional({ example: true, description: '是否启用预警' })
  @IsOptional()
  @IsBoolean()
  alertEnabled?: boolean;
}
