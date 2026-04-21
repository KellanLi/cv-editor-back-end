import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ErrorCode } from '@/common/enums/error-code.enum';
import { Response } from '@/types/response.types';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data: T) => {
        if (data instanceof StreamableFile) {
          return data as unknown as Response<T>;
        }
        return {
          code: ErrorCode.SUCCESS,
          message: 'success',
          data,
        };
      }),
    );
  }
}
