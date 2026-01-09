import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../dto/api-response.dto';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already an ApiResponse, return as is
        if (data instanceof ApiResponse) {
          return data;
        }

        // If data has code/message/data structure, return as is
        if (
          data &&
          typeof data === 'object' &&
          'code' in data &&
          'message' in data
        ) {
          return data;
        }

        // Wrap data in ApiResponse
        return ApiResponse.success(data);
      }),
    );
  }
}
