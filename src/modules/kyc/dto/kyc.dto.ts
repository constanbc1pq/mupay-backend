import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, Length, IsUrl } from 'class-validator';
import { IdType } from '@database/entities/kyc-record.entity';

export class SubmitBasicKycDto {
  @ApiProperty({ description: '真实姓名' })
  @IsString()
  @Length(2, 100)
  realName: string;

  @ApiProperty({ description: '证件类型', enum: IdType })
  @IsEnum(IdType)
  idType: IdType;

  @ApiProperty({ description: '证件号码' })
  @IsString()
  @Length(5, 50)
  idNumber: string;
}

export class SubmitAdvancedKycDto {
  @ApiProperty({ description: '证件正面照 URL' })
  @IsString()
  idFrontUrl: string;

  @ApiProperty({ description: '证件反面照 URL' })
  @IsString()
  idBackUrl: string;

  @ApiProperty({ description: '手持证件照 URL' })
  @IsString()
  holdingIdUrl: string;
}

export class FaceVerifyDto {
  @ApiProperty({ description: '人脸照片 URL 或 base64' })
  @IsString()
  faceImage: string;
}

export class KycStatusResponseDto {
  @ApiProperty({ description: '当前KYC等级' })
  level: number;

  @ApiProperty({ description: '认证状态' })
  status: string;

  @ApiPropertyOptional({ description: '拒绝原因' })
  rejectReason?: string;

  @ApiPropertyOptional({ description: '待审核的KYC记录' })
  pendingRecord?: any;
}

export class AdminReviewKycDto {
  @ApiPropertyOptional({ description: '拒绝原因 (拒绝时必填)' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  rejectReason?: string;
}
