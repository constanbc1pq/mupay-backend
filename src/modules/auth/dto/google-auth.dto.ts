import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google ID Token' })
  @IsNotEmpty({ message: 'ID Token不能为空' })
  @IsString()
  idToken: string;
}
