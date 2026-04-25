import { DynamicTool } from '@langchain/core/tools';
import { PrismaService } from '@/provider/prisma/prisma.service';
import { loadResumeContentForLlm } from '../loaders/resume-content.loader';

/**
 * 供 LLM 按需在对话中拉取整份/部分简历，而不在首包 system 里塞全文。
 * 入参为 JSON 字符串，例如：
 * - {}  或 {"scope":"full"} — 全量
 * - {"sectionIds":[1,2,3]} — 仅这些 Section
 * - {"scope":"outline"} — 只输出各 Section 轮廓（省 token）
 * 未传 sectionIds 且存在 suggested 时，loader 在工厂闭包里使用建议 id。
 */
export function createGetResumeContextTool(
  prisma: PrismaService,
  ctx: {
    resumeId: number;
    userId: number;
    suggestedSectionIds?: number[];
  },
): DynamicTool {
  return new DynamicTool({
    name: 'load_resume_context',
    description:
      '从数据库加载当前对话关联简历的正文/模块结构（含 Profile、各 Section 下 Content/Info 的 values JSON）。' +
      '在需要逐字引用、修改建议或对比某段经历时调用。入参为 JSON 字符串，字段：sectionIds?: number[]，scope?: "full"|"outline"。' +
      '与简历无关的闲聊不必调用。',
    func: async (raw: string) => {
      let sectionIds: number[] | undefined;
      let scope: 'full' | 'outline' = 'full';
      try {
        if (raw && String(raw).trim() !== '') {
          const j = JSON.parse(String(raw)) as {
            sectionIds?: number[];
            scope?: 'full' | 'outline';
          };
          if (j.sectionIds && Array.isArray(j.sectionIds)) {
            sectionIds = j.sectionIds
              .map((n) => Number(n))
              .filter((n) => !Number.isNaN(n));
          }
          if (j.scope === 'outline' || j.scope === 'full') {
            scope = j.scope;
          }
        }
      } catch {
        return 'load_resume_context：参数需为 JSON，例如 {} 或 {"sectionIds":[1,2],"scope":"full"}。';
      }

      if (!sectionIds?.length && (ctx.suggestedSectionIds?.length ?? 0) > 0) {
        sectionIds = ctx.suggestedSectionIds;
      }

      return loadResumeContentForLlm(prisma, {
        resumeId: ctx.resumeId,
        userId: ctx.userId,
        sectionIds,
        scope,
      });
    },
  });
}
