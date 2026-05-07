import { AiMessageRole } from '@/generated/enums';
import {
  ALL_AGENT_SKILLS,
  mountSkill,
  skillEligible,
  type SkillRuntimeContext,
} from '@/provider/langgraph/skills';

export type { BuildPrimitiveToolsParams } from '@/provider/langgraph/skills';

/**
 * 将已注册的 Agent Skills 装配为 LangChain tools（方案 B：一 Skill 一 tool）。
 * 注册表见 `skills/registry.ts`。
 */
export function buildPrimitiveTools(params: SkillRuntimeContext) {
  return ALL_AGENT_SKILLS.filter((s) => skillEligible(params, s)).map((s) =>
    mountSkill(params, s),
  );
}

export function mapDbMessagesToRoles(
  rows: { role: AiMessageRole; text: string | null }[],
): { role: 'user' | 'assistant'; text: string }[] {
  const out: { role: 'user' | 'assistant'; text: string }[] = [];
  for (const r of rows) {
    if (r.role === AiMessageRole.user || r.role === AiMessageRole.assistant) {
      out.push({
        role: r.role === AiMessageRole.user ? 'user' : 'assistant',
        text: r.text ?? '',
      });
    }
  }
  return out;
}
