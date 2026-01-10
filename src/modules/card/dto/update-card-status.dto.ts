import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';

/**
 * 更新卡状态 DTO
 */
export class UpdateCardStatusDto {
  @ApiProperty({
    example: 'frozen',
    description: '目标状态: active/frozen/cancelled',
  })
  @IsNotEmpty({ message: '状态不能为空' })
  @IsString()
  @IsIn(['active', 'frozen', 'cancelled'], { message: '无效的状态值' })
  status: 'active' | 'frozen' | 'cancelled';

  @ApiPropertyOptional({ example: '用户主动冻结', description: '变更原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}
