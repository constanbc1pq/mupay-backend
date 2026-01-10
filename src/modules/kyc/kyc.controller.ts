import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@database/entities/user.entity';
import { KycService } from './kyc.service';
import { SubmitBasicKycDto, SubmitAdvancedKycDto, FaceVerifyDto } from './dto/kyc.dto';

@ApiTags('KYC身份认证')
@Controller('kyc')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('status')
  @ApiOperation({ summary: '获取认证状态' })
  async getStatus(@CurrentUser() user: User) {
    return this.kycService.getStatus(user.id);
  }

  @Post('basic')
  @ApiOperation({ summary: '提交初级认证 (L1)' })
  async submitBasicKyc(
    @CurrentUser() user: User,
    @Body() dto: SubmitBasicKycDto,
  ) {
    return this.kycService.submitBasicKyc(user.id, dto);
  }

  @Post('advanced/upload')
  @ApiOperation({ summary: '上传高级认证证件照 (L2)' })
  async submitAdvancedKyc(
    @CurrentUser() user: User,
    @Body() dto: SubmitAdvancedKycDto,
  ) {
    return this.kycService.submitAdvancedKyc(user.id, dto);
  }

  @Post('advanced/face')
  @ApiOperation({ summary: '人脸识别验证 (L2)' })
  async faceVerify(
    @CurrentUser() user: User,
    @Body() dto: FaceVerifyDto,
  ) {
    return this.kycService.faceVerify(user.id, dto.faceImage);
  }

  @Get('records')
  @ApiOperation({ summary: '认证记录' })
  async getRecords(@CurrentUser() user: User) {
    return this.kycService.getRecords(user.id);
  }
}
