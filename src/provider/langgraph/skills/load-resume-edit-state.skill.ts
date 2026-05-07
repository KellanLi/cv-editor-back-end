import type { SkillDefinition } from './skill-runtime';
import {
  loadResumeEditStateSchema,
  normalizeIncludeTemplate,
  parseSectionIdsField,
} from './tool-helpers';

export const loadResumeEditStateSkill: SkillDefinition = {
  id: 'load_resume_edit_state',
  lane: 'read',
  description:
    '加载当前简历编辑所需状态：Section 与 Content/Info、简历 JD 摘要、全局上下文；可选附带 Content Template 结构。',
  schema: loadResumeEditStateSchema,
  async execute(ctx, raw) {
    const input = loadResumeEditStateSchema.parse(raw);
    const { prisma, resumeId, userId } = ctx;

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
      select: {
        id: true,
        title: true,
        jobDescriptionText: true,
      },
    });
    if (!resume) {
      return JSON.stringify({ ok: false, error: 'resume_not_found' });
    }

    const parsedIds = parseSectionIdsField(input.sectionIds);
    const scopeIds = parsedIds?.length
      ? parsedIds
      : ctx.suggestedSectionIds?.length
        ? ctx.suggestedSectionIds
        : undefined;

    const sections = await prisma.section.findMany({
      where: {
        resumeId,
        ...(scopeIds?.length ? { id: { in: scopeIds } } : {}),
      },
      include: {
        contents: {
          orderBy: { order: 'asc' },
          include: { infos: { orderBy: { order: 'asc' } } },
        },
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    const globalCtx = await prisma.aiGlobalContext.findMany({
      where: { resumeId },
      select: { key: true, value: true },
      orderBy: { key: 'asc' },
    });

    let templates: unknown[] = [];
    if (
      normalizeIncludeTemplate(input.includeTemplateSchema) &&
      sections.length > 0
    ) {
      const tids = [...new Set(sections.map((s) => s.contentTemplateId))];
      templates = await prisma.contentTemplate.findMany({
        where: { id: { in: tids }, userId },
        include: {
          infoTemplates: { orderBy: { order: 'asc' } },
        },
      });
    }

    return JSON.stringify({
      ok: true,
      resume: {
        id: resume.id,
        title: resume.title,
        jobDescriptionPreview: (resume.jobDescriptionText ?? '').slice(
          0,
          2000,
        ),
      },
      globalContexts: globalCtx.map((g) => ({
        key: g.key,
        valuePreview: g.value.slice(0, 1500),
      })),
      sections,
      templates,
    });
  },
};
