import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  Length,
} from 'class-validator';

/**
 * 更新持卡人 DTO
 */
export class UpdateCardholderDto {
  @ApiPropertyOptional({ description: '邮箱', example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: '电话', example: '+8613800138000' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  phone?: string;

  @ApiPropertyOptional({ description: '地址行1', example: '123 Main St' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  addressLine1?: string;

  @ApiPropertyOptional({ description: '地址行2' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  addressLine2?: string;

  @ApiPropertyOptional({ description: '城市', example: 'Shanghai' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @ApiPropertyOptional({ description: '州/省', example: 'Shanghai' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  state?: string;

  @ApiPropertyOptional({ description: '国家代码', example: 'CN' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiPropertyOptional({ description: '邮编', example: '200000' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  postalCode?: string;
}
