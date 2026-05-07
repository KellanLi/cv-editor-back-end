import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/client';
import { ErrorCode } from '@/common/enums/error-code.enum';

const filterLogger = new Logger('HttpExceptionFilter');

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
      filterLogger.error(
        `[PrismaClientKnownRequestError] code=${exception.code} message=${exception.message}`,
        exception.stack,
      );
      code = ErrorCode.DATABASE_ERROR;
      message = '数据库错误';
    } else if (exception instanceof PrismaClientValidationError) {
      filterLogger.error(
        `[PrismaClientValidationError] ${exception.message}`,
        exception.stack,
      );
      status = HttpStatus.BAD_REQUEST;
      code = ErrorCode.PARAM_ERROR;
      message = '数据库查询参数无效';
    } else if (exception instanceof PrismaClientUnknownRequestError) {
      filterLogger.error(
        `[PrismaClientUnknownRequestError] ${exception.message}`,
        exception.stack,
      );
    } else {
      const err = exception as Error | undefined;
      filterLogger.error(
        `未处理异常: ${err && typeof err.message === 'string' ? err.message : String(exception)}`,
        err?.stack,
      );
    }

    response.status(status).json({
      code,
      message,
      data: null,
    });
  }
}
