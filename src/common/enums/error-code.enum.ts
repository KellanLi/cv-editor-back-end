export const enum ErrorCode {
  /** 成功 */
  SUCCESS = 0,
  /** 内部错误 */
  INTERNAL_ERROR = 1,
  /** 参数错误 */
  PARAM_ERROR = 2,
  /** 认证错误 */
  AUTH_ERROR = 3,
  /** 权限错误 */
  PERMISSION_ERROR = 4,
  /** 未找到错误 */
  NOT_FOUND_ERROR = 5,
  /** 数据库操作错误 */
  DATABASE_ERROR = 6,
}
