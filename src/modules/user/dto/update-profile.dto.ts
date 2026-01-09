import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: '昵称', description: '昵称', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @ApiProperty({ example: 'https://...', description: '头像URL', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  avatar?: string;
}
