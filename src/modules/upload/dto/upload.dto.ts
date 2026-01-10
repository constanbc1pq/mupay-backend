import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({ description: '文件访问 URL' })
  url: string;

  @ApiProperty({ description: '文件路径' })
  path: string;

  @ApiProperty({ description: '文件名' })
  filename: string;

  @ApiProperty({ description: '原始文件名' })
  originalName: string;

  @ApiProperty({ description: 'MIME 类型' })
  mimeType: string;

  @ApiProperty({ description: '文件大小 (bytes)' })
  size: number;
}
