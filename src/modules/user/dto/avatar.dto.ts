import { ApiProperty } from '@nestjs/swagger';

export class AvatarUploadResponseDto {
  @ApiProperty({ description: '头像 URL' })
  avatarUrl: string;

  @ApiProperty({ description: '消息ID' })
  messageId: string;
}
