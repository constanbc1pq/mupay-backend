import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SearchUserDto {
  @ApiProperty({ example: 'test', description: '搜索关键词(用户名/手机号/昵称)' })
  @IsNotEmpty({ message: '关键词不能为空' })
  @IsString()
  @MinLength(2, { message: '关键词至少2个字符' })
  keyword: string;
}
