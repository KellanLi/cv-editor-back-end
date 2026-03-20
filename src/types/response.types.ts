import { ErrorCode } from '../common/enums/error-code.enum';

/**
 * 全局响应类型定义
 */
export interface Response<T> {
  code: ErrorCode;
  message: string;
  data: T;
}
