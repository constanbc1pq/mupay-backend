import { ApiProperty } from '@nestjs/swagger';
import { MSG, MessageCode } from '../constants/messages';

export class ApiResponse<T> {
  @ApiProperty({ example: 0, description: '状态码，0表示成功' })
  code: number;

  @ApiProperty({ example: 'MSG_0000', description: '消息ID，前端根据此ID显示对应语言文案' })
  messageId: string;

  @ApiProperty({ description: '数据' })
  data: T;

  constructor(data: T, messageId: string = MSG.SUCCESS, code = 0) {
    this.code = code;
    this.messageId = messageId;
    this.data = data;
  }

  static success<T>(data: T, messageId: MessageCode = MSG.SUCCESS): ApiResponse<T> {
    return new ApiResponse(data, messageId, 0);
  }

  static error<T = null>(code: number, messageId: MessageCode, data: T = null as T): ApiResponse<T> {
    return new ApiResponse(data, messageId, code);
  }
}

export class PaginatedResponse<T> {
  @ApiProperty({ description: '数据列表' })
  items: T[];

  @ApiProperty({ example: 100, description: '总条数' })
  total: number;

  @ApiProperty({ example: 1, description: '当前页' })
  page: number;

  @ApiProperty({ example: 10, description: '每页条数' })
  pageSize: number;

  @ApiProperty({ example: 10, description: '总页数' })
  totalPages: number;

  constructor(items: T[], total: number, page: number, pageSize: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.pageSize = pageSize;
    this.totalPages = Math.ceil(total / pageSize);
  }
}

export class PaginationQueryDto {
  @ApiProperty({ example: 1, description: '页码', required: false })
  page?: number = 1;

  @ApiProperty({ example: 10, description: '每页条数', required: false })
  pageSize?: number = 10;
}
