import { tool } from '@langchain/core/tools';
import type { z } from 'zod';
import { PrismaService } from '@/provider/prisma/prisma.service';
import { SectionService } from '@/modules/section/section.service';
import type { IJwtPayload } from '@/types/auth.types';
import { AiConversationPurpose } from '@/generated/enums';

/** AgentCore 运行时注入；各 Skill 共享同一上下文（方案 B：一 Skill 一 LangChain tool） */
export type SkillRuntimeContext = {
  prisma: PrismaService;
  sectionService: SectionService;
  userId: number;
  resumeId: number;
  purpose: AiConversationPurpose;
  suggestedSectionIds?: number[];
  enableWebSearch: boolean;
  tavilyApiKey: string;
  /** 诊断类 Skill 调 LLM；由 LanggraphService 注入 */
  llmConfig?: { apiKey: string; baseUrl: string; model: string };
};

/** @deprecated 与 `SkillRuntimeContext` 相同，保留别名供既有 import */
export type BuildPrimitiveToolsParams = SkillRuntimeContext;

export type SkillDefinition = {
  /** 与 LangChain `tool.name` 一致，作为 Skill 稳定 id */
  id: string;
  description: string;
  schema: z.ZodTypeAny;
  /** read：始终挂载；write：仅编辑；web：联网；diagnosis：仅简历诊断会话 */
  lane: 'read' | 'write' | 'web' | 'diagnosis';
  execute: (ctx: SkillRuntimeContext, input: unknown) => Promise<string>;
};

export function jwtFor(userId: number): IJwtPayload {
  return { id: userId, email: 'agent-core@internal' };
}

export function mountSkill(
  ctx: SkillRuntimeContext,
  def: SkillDefinition,
): ReturnType<typeof tool> {
  return tool(async (input: unknown) => def.execute(ctx, input), {
    name: def.id,
    description: def.description,
    schema: def.schema,
  });
}

export function skillEligible(
  ctx: SkillRuntimeContext,
  def: SkillDefinition,
): boolean {
  if (def.lane === 'write') {
    return ctx.purpose === AiConversationPurpose.DIALOGUE_EDIT;
  }
  if (def.lane === 'web') {
    return !!(ctx.enableWebSearch && ctx.tavilyApiKey?.trim());
  }
  if (def.lane === 'diagnosis') {
    return ctx.purpose === AiConversationPurpose.RESUME_DIAGNOSIS;
  }
  return true;
}
