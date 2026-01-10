export interface UploadResult {
  url: string;
  path: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface UploadOptions {
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
  resize?: {
    width: number;
    height: number;
  };
}

export interface StorageProvider {
  /**
   * Upload a file
   * @param file - File buffer
   * @param filename - Original filename
   * @param options - Upload options
   */
  upload(
    file: Buffer,
    filename: string,
    options?: UploadOptions,
  ): Promise<UploadResult>;

  /**
   * Delete a file
   * @param path - File path
   */
  delete(path: string): Promise<boolean>;

  /**
   * Check if file exists
   * @param path - File path
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get file URL
   * @param path - File path
   */
  getUrl(path: string): string;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
