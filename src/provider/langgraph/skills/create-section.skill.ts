import { jwtFor, type SkillDefinition } from './skill-runtime';
import { createSectionSchema, toInt } from './tool-helpers';

export const createSectionSkill: SkillDefinition = {
  id: 'create_section',
  lane: 'write',
  description:
    '按 Content Template 新建 Section（初始空内容由模板决定）。仅在编辑模式下可用。',
  schema: createSectionSchema,
  async execute(ctx, raw) {
    const input = createSectionSchema.parse(raw);
    const jwt = jwtFor(ctx.userId);
    const { prisma, resumeId } = ctx;
    try {
      const contentTemplateId = toInt(input.contentTemplateId);
      let order = input.order !== undefined ? toInt(input.order) : undefined;
      if (order === undefined) {
        const agg = await prisma.section.aggregate({
          where: { resumeId },
          _max: { order: true },
        });
        order = (agg._max.order ?? 0) + 1;
      }
      const created = await ctx.sectionService.create(
        {
          resumeId,
          contentTemplateId,
          order,
        },
        jwt,
      );
      return JSON.stringify({ ok: true, section: created });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return JSON.stringify({ ok: false, error: msg });
    }
  },
};
