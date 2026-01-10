import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDateString,
  Length,
  Matches,
  IsUUID,
} from 'class-validator';
import { CardholderIdType } from '../../../database/entities/cardholder.entity';

/**
 * 创建持卡人 DTO
 */
export class CreateCardholderDto {
  @ApiProperty({ description: '服务商ID' })
  @IsUUID()
  providerId: string;

  @ApiProperty({ description: '名', example: 'John' })
  @IsString()
  @Length(1, 100)
  firstName: string;

  @ApiProperty({ description: '姓', example: 'Doe' })
  @IsString()
  @Length(1, 100)
  lastName: string;

  @ApiProperty({ description: '邮箱', example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: '电话', example: '+8613800138000' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  phone?: string;

  @ApiPropertyOptional({
    description: '证件类型',
    enum: CardholderIdType,
    default: CardholderIdType.PASSPORT,
  })
  @IsOptional()
  @IsEnum(CardholderIdType)
  idType?: CardholderIdType;

  @ApiPropertyOptional({ description: '证件号码', example: 'E12345678' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  idNumber?: string;

  @ApiPropertyOptional({ description: '国籍 (ISO 3166-1 alpha-2)', example: 'CN' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/)
  nationality?: string;

  @ApiPropertyOptional({ description: '出生日期', example: '1990-01-01' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

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
