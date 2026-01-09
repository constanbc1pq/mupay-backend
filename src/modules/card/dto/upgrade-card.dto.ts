import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class UpgradeCardDto {
  @ApiProperty({ example: 'silver', description: '目标等级: silver/gold' })
  @IsNotEmpty({ message: '目标等级不能为空' })
  @IsString()
  @IsIn(['silver', 'gold'], { message: '无效的目标等级' })
  targetLevel: string;
}
