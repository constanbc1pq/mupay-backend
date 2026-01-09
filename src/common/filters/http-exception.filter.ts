import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { MSG } from '../constants/messages';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let messageId: string = MSG.SERVER_ERROR;
    let code = 50000;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        messageId = this.resolveMessageId(exceptionResponse, status);
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as any;
        const msg = res.message || res.error;
        messageId = this.resolveMessageId(msg, status);
        code = res.code || this.getDefaultCode(status);
      }
    } else if (exception instanceof Error) {
      messageId = this.resolveMessageId(exception.message, status);
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    // Log error details
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${messageId}`,
    );

    response.status(status).json({
      code,
      messageId,
      data: null,
    });
  }

  /**
   * 判断消息是否为 MSG_ 开头的消息ID
   * 如果是则直接返回，否则根据状态码返回默认消息ID
   */
  private resolveMessageId(message: string | string[], status: number): string {
    // Handle array of messages (validation errors)
    const msg = Array.isArray(message) ? message[0] : message;

    // If already a message ID, return it
    if (msg && msg.startsWith('MSG_')) {
      return msg;
    }

    // Return default message ID based on status
    return this.getDefaultMessageId(status);
  }

  private getDefaultMessageId(status: number): string {
    const messageMap: Record<number, string> = {
      400: MSG.INVALID_PARAMS,
      401: MSG.UNAUTHORIZED,
      403: MSG.FORBIDDEN,
      404: MSG.NOT_FOUND,
      429: MSG.TOO_MANY_REQUESTS,
      500: MSG.SERVER_ERROR,
    };
    return messageMap[status] || MSG.SERVER_ERROR;
  }

  private getDefaultCode(status: number): number {
    const codeMap: Record<number, number> = {
      400: 40000,
      401: 40100,
      403: 40300,
      404: 40400,
      409: 40900,
      422: 42200,
      429: 42900,
      500: 50000,
    };
    return codeMap[status] || 50000;
  }
}
