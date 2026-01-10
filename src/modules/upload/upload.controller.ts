import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@database/entities/user.entity';
import { UploadService } from './upload.service';
import { UploadResponseDto } from './dto/upload.dto';
import { MSG } from '@common/constants/messages';

@ApiTags('文件上传')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @ApiOperation({ summary: '上传图片' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '图片文件 (jpg/png/gif/webp, max 5MB)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException(MSG.INVALID_PARAMS);
    }
    return this.uploadService.uploadImage(file);
  }

  @Post('avatar')
  @ApiOperation({ summary: '上传头像' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '头像图片 (jpg/png/gif/webp, max 2MB, 自动裁剪为200x200)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException(MSG.INVALID_PARAMS);
    }
    return this.uploadService.uploadAvatar(file, user.id);
  }

  @Post('kyc/id-front')
  @ApiOperation({ summary: '上传证件正面照' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '证件正面照片 (jpg/png, max 5MB)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadIdFront(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException(MSG.INVALID_PARAMS);
    }
    return this.uploadService.uploadKycDocument(file, user.id, 'id_front');
  }

  @Post('kyc/id-back')
  @ApiOperation({ summary: '上传证件反面照' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '证件反面照片 (jpg/png, max 5MB)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadIdBack(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException(MSG.INVALID_PARAMS);
    }
    return this.uploadService.uploadKycDocument(file, user.id, 'id_back');
  }

  @Post('kyc/holding-id')
  @ApiOperation({ summary: '上传手持证件照' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '手持证件照片 (jpg/png, max 5MB)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadHoldingId(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException(MSG.INVALID_PARAMS);
    }
    return this.uploadService.uploadKycDocument(file, user.id, 'holding_id');
  }
}
