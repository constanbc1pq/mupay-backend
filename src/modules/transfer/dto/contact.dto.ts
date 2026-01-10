import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, MaxLength } from 'class-validator';

export class AddContactDto {
  @ApiProperty({ description: '联系人用户ID' })
  @IsUUID()
  contactUserId: string;

  @ApiProperty({ description: '备注名', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  remark?: string;
}

export class UpdateContactDto {
  @ApiProperty({ description: '备注名' })
  @IsString()
  @MaxLength(50)
  remark: string;
}

export class ContactQueryDto {
  @ApiProperty({ description: '搜索关键词 (备注名/用户名)', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;
}
