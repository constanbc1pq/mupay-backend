import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  StorageProvider,
  UploadResult,
  UploadOptions,
} from './storage.interface';

/**
 * AWS S3 Storage Service
 *
 * This is a placeholder implementation for AWS S3 storage.
 * To enable S3 storage:
 * 1. Install AWS SDK: yarn add @aws-sdk/client-s3
 * 2. Configure environment variables:
 *    - AWS_ACCESS_KEY_ID
 *    - AWS_SECRET_ACCESS_KEY
 *    - AWS_REGION
 *    - AWS_S3_BUCKET
 * 3. Set STORAGE_PROVIDER=s3
 */
@Injectable()
export class S3StorageService implements StorageProvider {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly bucket: string;
  private readonly region: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET', '');
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.baseUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com`;

    if (!this.bucket) {
      this.logger.warn(
        'AWS S3 bucket not configured. S3 storage will not work.',
      );
    }
  }

  async upload(
    file: Buffer,
    filename: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    // TODO: Implement S3 upload when AWS SDK is installed
    // Example implementation:
    //
    // const s3Client = new S3Client({ region: this.region });
    // const key = `${options?.folder || 'general'}/${this.generateFilename(filename)}`;
    //
    // await s3Client.send(new PutObjectCommand({
    //   Bucket: this.bucket,
    //   Key: key,
    //   Body: file,
    //   ContentType: this.getMimeType(filename),
    // }));
    //
    // return {
    //   url: `${this.baseUrl}/${key}`,
    //   path: key,
    //   filename: path.basename(key),
    //   originalName: filename,
    //   mimeType: this.getMimeType(filename),
    //   size: file.length,
    // };

    throw new NotImplementedException(
      'S3 storage is not implemented yet. Please use local storage or implement S3 upload.',
    );
  }

  async delete(filePath: string): Promise<boolean> {
    // TODO: Implement S3 delete when AWS SDK is installed
    // Example implementation:
    //
    // const s3Client = new S3Client({ region: this.region });
    // await s3Client.send(new DeleteObjectCommand({
    //   Bucket: this.bucket,
    //   Key: filePath,
    // }));
    // return true;

    throw new NotImplementedException(
      'S3 storage is not implemented yet. Please use local storage.',
    );
  }

  async exists(filePath: string): Promise<boolean> {
    // TODO: Implement S3 exists check when AWS SDK is installed
    // Example implementation:
    //
    // const s3Client = new S3Client({ region: this.region });
    // try {
    //   await s3Client.send(new HeadObjectCommand({
    //     Bucket: this.bucket,
    //     Key: filePath,
    //   }));
    //   return true;
    // } catch {
    //   return false;
    // }

    throw new NotImplementedException(
      'S3 storage is not implemented yet. Please use local storage.',
    );
  }

  getUrl(filePath: string): string {
    return `${this.baseUrl}/${filePath}`;
  }
}
