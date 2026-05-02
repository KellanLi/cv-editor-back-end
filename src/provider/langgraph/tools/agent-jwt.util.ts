import type { IJwtPayload } from '@/types/auth.types';

/** LangGraph 工具内调用需 JWT 的 Service 时使用（仅依赖 `id`）。 */
export function jwtPayloadForAgent(userId: number): IJwtPayload {
  return { id: userId, email: 'langgraph-agent@internal.local' };
}
