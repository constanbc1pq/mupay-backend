import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class RequestDeletionDto {
  @ApiPropertyOptional({ description: '注销原因' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class DeletionCheckResultDto {
  @ApiProperty({ description: '是否可以注销' })
  canDelete: boolean;

  @ApiPropertyOptional({ description: '阻止原因列表' })
  blockers?: string[];

  @ApiProperty({ description: '余额' })
  balance: number;

  @ApiProperty({ description: '是否有进行中的订单' })
  hasPendingOrders: boolean;

  @ApiProperty({ description: '是否有活跃的卡片' })
  hasActiveCards: boolean;
}

export class DeletionStatusDto {
  @ApiProperty({ description: '是否有待处理的注销请求' })
  hasPendingRequest: boolean;

  @ApiPropertyOptional({ description: '请求时间' })
  requestedAt?: Date;

  @ApiPropertyOptional({ description: '计划执行时间' })
  scheduledAt?: Date;

  @ApiPropertyOptional({ description: '剩余天数' })
  remainingDays?: number;
}
