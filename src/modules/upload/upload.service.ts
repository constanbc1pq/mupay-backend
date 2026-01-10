import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as sharp from 'sharp';
import {
  STORAGE_PROVIDER,
  StorageProvider,
  UploadResult,
} from '@services/storage/storage.interface';
import { MSG } from '@common/constants/messages';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  // Allowed image types
  private readonly allowedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  // Max file sizes
  private readonly maxImageSize = 5 * 1024 * 1024; // 5MB
  private readonly maxAvatarSize = 2 * 1024 * 1024; // 2MB

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  /**
   * Upload a general image
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'images',
  ): Promise<UploadResult> {
    this.validateImageFile(file, this.maxImageSize);

    return this.storageProvider.upload(file.buffer, file.originalname, {
      folder,
    });
  }

  /**
   * Upload and resize avatar
   */
  async uploadAvatar(
    file: Express.Multer.File,
    userId: string,
  ): Promise<UploadResult> {
    this.validateImageFile(file, this.maxAvatarSize);

    // Resize avatar to 200x200
    const resizedBuffer = await this.resizeImage(file.buffer, 200, 200);

    return this.storageProvider.upload(resizedBuffer, file.originalname, {
      folder: `avatars/${userId}`,
    });
  }

  /**
   * Upload KYC document (encrypted storage)
   */
  async uploadKycDocument(
    file: Express.Multer.File,
    userId: string,
    docType: 'id_front' | 'id_back' | 'holding_id',
  ): Promise<UploadResult> {
    this.validateImageFile(file, this.maxImageSize);

    // For KYC documents, we might want to add encryption in the future
    // For now, just store in a secure folder with user ID
    return this.storageProvider.upload(file.buffer, file.originalname, {
      folder: `kyc/${userId}/${docType}`,
    });
  }

  /**
   * Delete a file
   */
  async deleteFile(path: string): Promise<boolean> {
    return this.storageProvider.delete(path);
  }

  /**
   * Validate image file
   */
  private validateImageFile(
    file: Express.Multer.File,
    maxSize: number,
  ): void {
    if (!file) {
      throw new BadRequestException({
        messageId: MSG.INVALID_PARAMS,
        message: 'File is required',
      });
    }

    if (!this.allowedImageTypes.includes(file.mimetype)) {
      throw new BadRequestException({
        messageId: MSG.INVALID_PARAMS,
        message: 'Invalid file type. Allowed: jpg, png, gif, webp',
      });
    }

    if (file.size > maxSize) {
      throw new BadRequestException({
        messageId: MSG.INVALID_PARAMS,
        message: `File too large. Max size: ${maxSize / 1024 / 1024}MB`,
      });
    }
  }

  /**
   * Resize image using sharp
   */
  private async resizeImage(
    buffer: Buffer,
    width: number,
    height: number,
  ): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (error) {
      this.logger.error('Failed to resize image', error);
      throw new BadRequestException({
        messageId: MSG.INVALID_PARAMS,
        message: 'Failed to process image',
      });
    }
  }
}
