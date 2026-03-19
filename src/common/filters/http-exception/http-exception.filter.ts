import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { ErrorCode } from '@/common/enums/error-code.enum';

@Catch()
export class HttpExceptionFilter<T = unknown> implements ExceptionFilter {
  catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let code: number = ErrorCode.INTERNAL_ERROR;

    // 👉 Nest 内置异常
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        if ('message' in res) {
          const msg = (res as { message?: string | string[] }).message;

          if (Array.isArray(msg)) {
            message = msg.join(', ');
          } else if (typeof msg === 'string') {
            message = msg;
          }
        }
      }
      code = status;
    } else if (exception instanceof PrismaClientKnownRequestError) {
      code = ErrorCode.DATABASE_ERROR;
      message = '数据库错误';
    } else {
      console.error('未知错误', exception);
    }

    response.status(status).json({
      code,
      message,
      data: null,
    });
  }
}
