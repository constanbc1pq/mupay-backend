import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  StorageProvider,
  UploadResult,
  UploadOptions,
} from './storage.interface';

@Injectable()
export class LocalStorageService implements StorageProvider {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>(
      'UPLOAD_DIR',
      path.join(process.cwd(), 'uploads'),
    );
    this.baseUrl = this.configService.get<string>(
      'UPLOAD_BASE_URL',
      '/uploads',
    );

    // Ensure upload directory exists
    this.ensureDir(this.uploadDir);
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      this.logger.log(`Created upload directory: ${dir}`);
    }
  }

  private generateFilename(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const hash = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return `${timestamp}-${hash}${ext}`;
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  async upload(
    file: Buffer,
    filename: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const folder = options?.folder || 'general';
    const folderPath = path.join(this.uploadDir, folder);
    this.ensureDir(folderPath);

    const newFilename = this.generateFilename(filename);
    const filePath = path.join(folderPath, newFilename);
    const relativePath = path.join(folder, newFilename);

    // Write file to disk
    await fs.promises.writeFile(filePath, file);

    this.logger.log(`File uploaded: ${relativePath}`);

    return {
      url: this.getUrl(relativePath),
      path: relativePath,
      filename: newFilename,
      originalName: filename,
      mimeType: this.getMimeType(filename),
      size: file.length,
    };
  }

  async delete(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      if (await this.exists(filePath)) {
        await fs.promises.unlink(fullPath);
        this.logger.log(`File deleted: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to delete file: ${filePath}`, error);
      return false;
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      await fs.promises.access(fullPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  getUrl(filePath: string): string {
    return `${this.baseUrl}/${filePath.replace(/\\/g, '/')}`;
  }
}
