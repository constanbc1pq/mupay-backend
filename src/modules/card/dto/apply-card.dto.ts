import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class ApplyCardDto {
  @ApiProperty({ example: 'enjoy', description: '卡片类型: enjoy/universal' })
  @IsNotEmpty({ message: '卡片类型不能为空' })
  @IsString()
  @IsIn(['enjoy', 'universal'], { message: '无效的卡片类型' })
  type: string;
}
