import { z } from 'zod';
import type { SkillDefinition } from './skill-runtime';
import { executeResumeDiagnosis } from '@/provider/langgraph/resume-diagnosis';

const resumeDiagnosisSchema = z.object({
  targetRole: z
    .string()
    .optional()
    .describe(
      '当简历无可靠 JD 时，用于联网检索或推断的岗位方向（如「Java 后端」）；可空，将使用档案中的目标岗位或简历标题',
    ),
});

export const resumeDiagnosisSkill: SkillDefinition = {
  id: 'run_resume_diagnosis',
  lane: 'diagnosis',
  description:
    '对当前简历执行完整 AI 诊断 SOP：解析/生成 JD → 标准编写思路 → 评价维度 → 各维度与总分 → 按 Content 给出 delete/expand/simplify 建议，并给出整体/模块级「应增补」建议。',
  schema: resumeDiagnosisSchema,
  async execute(ctx, raw) {
    const input = resumeDiagnosisSchema.parse(raw);
    const cfg = ctx.llmConfig;
    if (!cfg?.apiKey?.trim()) {
      return JSON.stringify({
        ok: false,
        error: 'missing_llm_config',
        hint: '服务端未配置大模型 API Key，无法运行简历诊断。',
      });
    }
    try {
      const report = await executeResumeDiagnosis({
        prisma: ctx.prisma,
        userId: ctx.userId,
        resumeId: ctx.resumeId,
        targetRole: input.targetRole,
        enableWebSearch: ctx.enableWebSearch,
        tavilyApiKey: ctx.tavilyApiKey ?? '',
        llm: {
          apiKey: cfg.apiKey,
          baseUrl: cfg.baseUrl,
          model: cfg.model,
        },
      });
      return JSON.stringify({ ok: true, report });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'resume_not_found') {
        return JSON.stringify({ ok: false, error: 'resume_not_found' });
      }
      return JSON.stringify({ ok: false, error: msg });
    }
  },
};
