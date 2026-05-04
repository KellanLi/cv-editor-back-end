import { PrismaService } from '@/provider/prisma/prisma.service';

export type LoadResumeContentParams = {
  resumeId: number;
  userId: number;
  /** 只拉这些 Section；空/undefined 表示该简历下全部 Section */
  sectionIds?: number[];
  /** 骨架：后续可做 outline（仅 id/template）以省 token */
  scope?: 'full' | 'outline';
};

/**
 * 从 DB 组装可喂给 LLM 的简历文本（Section → Content → Info；含 ResumeProfile 摘要）
 * 与 domain 中 Section / Content / Info 命名一致
 */
export async function loadResumeContentForLlm(
  prisma: PrismaService,
  p: LoadResumeContentParams,
): Promise<string> {
  const scope = p.scope ?? 'full';

  const owned = await prisma.resume.findFirst({
    where: { id: p.resumeId, userId: p.userId },
    include: {
      profile: true,
      sections: {
        where:
          p.sectionIds && p.sectionIds.length > 0
            ? { id: { in: p.sectionIds } }
            : undefined,
        orderBy: { order: 'asc' },
        include: {
          contents: {
            orderBy: { order: 'asc' },
            include: { infos: { orderBy: { order: 'asc' } } },
          },
        },
      },
    },
  });

  if (!owned) {
    return '（错误）简历不存在或无权访问。';
  }

  if (scope === 'outline') {
    return [
      `resumeId=${owned.id} title=${owned.title}`,
      ...owned.sections.map(
        (s) =>
          `Section#${s.id} order=${s.order} contentTemplateId=${s.contentTemplateId} contents=${s.contents.length}`,
      ),
    ].join('\n');
  }

  const header: string[] = [`【简历】${owned.title}（id=${owned.id}）`];
  const jd = (owned.jobDescriptionText ?? '').trim();
  if (jd.length > 0) {
    header.push(`【JD】\n${jd}`);
  }
  if (owned.profile) {
    const pr = owned.profile;
    header.push(
      `【Profile】姓名=${pr.fullName ?? '—'} 目标岗位=${pr.targetPosition ?? '—'} 手机=${pr.phone ?? '—'} 邮箱=${pr.email ?? '—'}`,
    );
  }

  const body: string[] = [];
  for (const sec of owned.sections) {
    body.push(
      `--- Section id=${sec.id} order=${sec.order} (contentTemplateId=${sec.contentTemplateId}) ---`,
    );
    for (const c of sec.contents) {
      body.push(`  · Content#${c.id} order=${c.order}`);
      for (const info of c.infos) {
        const raw =
          typeof info.values === 'object' && info.values !== null
            ? JSON.stringify(info.values)
            : String(info.values);
        body.push(`    [Info ${info.type} o=${info.order}] ${raw}`);
      }
    }
  }

  return `${header.join('\n')}\n${body.join('\n')}`;
}
