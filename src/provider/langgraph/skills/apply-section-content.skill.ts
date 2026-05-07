import { jwtFor, type SkillDefinition } from './skill-runtime';
import {
  applySectionContentSchema,
  normalizeApplyContents,
  toInt,
} from './tool-helpers';

export const applySectionContentSkill: SkillDefinition = {
  id: 'apply_section_content',
  lane: 'write',
  description:
    '更新已有 Section 下的全部内容与信息层（整模块替换，与前端 PATCH 一致）。contents 可为对象数组，或整条 JSON 数组字符串；每条含 order 与 infos。',
  schema: applySectionContentSchema,
  async execute(ctx, raw) {
    const input = applySectionContentSchema.parse(raw);
    const jwt = jwtFor(ctx.userId);
    try {
      const sectionId = toInt(input.sectionId);
      const contents = normalizeApplyContents(input.contents);
      const updated = await ctx.sectionService.updateContent(
        { sectionId, contents },
        jwt,
      );
      return JSON.stringify({ ok: true, section: updated });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return JSON.stringify({ ok: false, error: msg });
    }
  },
};
