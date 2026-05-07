import { PrismaService } from '@/provider/prisma/prisma.service';
import type { IJwtPayload } from '@/types/auth.types';
import { AiConversationPurpose, AiMessageRole } from '@/generated/enums';

/** SOUL：人格与边界（静态，可后续改为配置/DB） */
const SOUL_FRAGMENT = [
  '你是「简历编辑助手」，使用简体中文。',
  '回答应紧扣用户问题；涉及修改简历时须遵守当前会话 purpose 与可用工具约束。',
  '不编造未调用工具而产生的简历变更；不确定时先 load_resume_edit_state。',
].join('\n');

const GLOBAL_CONTEXT_VALUE_CAP = 2500;
const GLOBAL_CONTEXT_MAX_ROWS = 40;

export type BuildAgentSystemPromptParams = {
  prisma: PrismaService;
  resumeId: number;
  conversationId: number;
  jwt: IJwtPayload;
  selectedSectionIds?: number[];
  enableWebSearch: boolean;
  purpose: AiConversationPurpose;
  /** 若已由 `ConversationContextLoaderService` 预取，可避免重复读 `AiConversationContextSummary` */
  preloadedSessionSummary?: {
    rollingSummary: string | null;
    coversUpToSeq: number;
  } | null;
};

function buildToolsFragment(
  purpose: AiConversationPurpose,
  enableWebSearch: boolean,
): string {
  const lines = [
    '【TOOLS｜当前挂载的工具】',
    '- `load_resume_edit_state`：读简历 Section/内容/模板结构。',
  ];
  if (purpose === AiConversationPurpose.RESUME_DIAGNOSIS) {
    lines.push(
      '- `run_resume_diagnosis`：一键执行简历 AI 诊断（JD→编写思路→评价维度→打分→分块修改建议与整体增补建议）；可选传目标岗位以便无 JD 时检索/推断。',
    );
  }
  lines.push(
    purpose === AiConversationPurpose.DIALOGUE_EDIT
      ? '- `apply_section_content` / `create_section`：写简历（仅编辑模式）。'
      : '- 写简历工具未挂载（非编辑模式）。',
  );
  if (enableWebSearch) {
    lines.push('- `search_web_context`：联网检索（用户已开启）。');
  } else {
    lines.push('- 联网工具未挂载（用户未开启）。');
  }
  return lines.join('\n');
}

/**
 * SESSION：近期消息窗口（与折叠摘要配合），仅 user/assistant，按时间正序。
 * 若存在 `AiConversationContextSummary`，只拉取 `seq > coversUpToSeq` 的消息，再取最近 `maxRecent` 条。
 */
export async function loadSessionMessagesForAgent(
  prisma: PrismaService,
  conversationId: number,
  options?: { maxRecent?: number },
): Promise<{
  rows: { role: AiMessageRole; text: string | null }[];
  rollingSummary: string | null;
  coversUpToSeq: number;
}> {
  const maxRecent = options?.maxRecent ?? 48;

  const summary = await prisma.aiConversationContextSummary.findUnique({
    where: { conversationId },
    select: { rollingSummary: true, coversUpToSeq: true },
  });
  const covers = summary?.coversUpToSeq ?? 0;

  const rows = await prisma.aiMessage.findMany({
    where: {
      conversationId,
      role: { in: [AiMessageRole.user, AiMessageRole.assistant] },
      ...(covers > 0 ? { seq: { gt: covers } } : {}),
    },
    orderBy: { seq: 'desc' },
    take: maxRecent,
    select: { role: true, text: true },
  });

  return {
    rows: rows.slice().reverse(),
    rollingSummary: summary?.rollingSummary ?? null,
    coversUpToSeq: covers,
  };
}

/**
 * 进线装配：SOUL + SESSION 摘要 + 线程元数据 + USER/业务（全局上下文+JD）+ TOOLS。
 * 与 `load_resume_edit_state` 解耦：此处不负责「整份 Section 快照」。
 */
export async function buildAgentSystemPrompt(
  params: BuildAgentSystemPromptParams,
): Promise<string> {
  const {
    prisma,
    resumeId,
    conversationId,
    jwt,
    selectedSectionIds,
    enableWebSearch,
    purpose,
    preloadedSessionSummary,
  } = params;

  const [resume, conv, globalRows] = await Promise.all([
    prisma.resume.findFirst({
      where: { id: resumeId, userId: jwt.id },
      select: { title: true, jobDescriptionText: true },
    }),
    prisma.aiConversation.findFirst({
      where: { id: conversationId, resumeId, resume: { userId: jwt.id } },
      select: { title: true, threadId: true, purpose: true },
    }),
    prisma.aiGlobalContext.findMany({
      where: { resumeId },
      orderBy: { key: 'asc' },
      take: GLOBAL_CONTEXT_MAX_ROWS,
      select: { key: true, value: true },
    }),
  ]);

  const jdField = resume?.jobDescriptionText?.trim()
    ? resume.jobDescriptionText.trim().slice(0, 4000)
    : null;

  const jdFromGlobal = globalRows.find((g) => g.key === 'job_description');
  const jd =
    jdField ??
    (jdFromGlobal?.value?.trim()
      ? jdFromGlobal.value.trim().slice(0, 4000)
      : null);

  const otherGlobals = globalRows.filter((g) => g.key !== 'job_description');

  const globalBlock =
    otherGlobals.length > 0
      ? [
          '【USER｜简历级全局记忆｜AiGlobalContext】',
          ...otherGlobals.map(
            (g) =>
              `- **${g.key}**（前 ${GLOBAL_CONTEXT_VALUE_CAP} 字）\n${g.value.slice(0, GLOBAL_CONTEXT_VALUE_CAP)}`,
          ),
        ].join('\n')
      : globalRows.length === 0
        ? '【USER｜简历级全局记忆】（暂无 AiGlobalContext 条目）'
        : '【USER｜简历级全局记忆】（除 `job_description` 外无其它条目，JD 见上文）';

  const summary =
    preloadedSessionSummary !== undefined && preloadedSessionSummary !== null
      ? {
          rollingSummary: preloadedSessionSummary.rollingSummary,
          coversUpToSeq: preloadedSessionSummary.coversUpToSeq,
        }
      : await prisma.aiConversationContextSummary.findUnique({
          where: { conversationId },
          select: { rollingSummary: true, coversUpToSeq: true },
        });
  const sessionSummaryBlock =
    summary?.rollingSummary?.trim() && (summary.coversUpToSeq ?? 0) > 0
      ? [
          '【SESSION｜早期多轮压缩摘要】',
          `（已折叠 seq 1–${summary.coversUpToSeq} 的明细；以下摘要供连贯理解，细节以当前消息与工具为准）`,
          summary.rollingSummary.trim().slice(0, 12000),
        ].join('\n')
      : '';

  const purposeLine =
    purpose === AiConversationPurpose.DIALOGUE_EDIT
      ? `数据库 purpose=${purpose}（**编辑模式**）。可写简历；**禁止**谎称仅问答。threadId=${conv?.threadId ?? '?'}`
      : purpose === AiConversationPurpose.RESUME_DIAGNOSIS
        ? `数据库 purpose=${purpose}（**简历诊断**）。只读；**禁止**调用写简历工具；需要完整结构化诊断时调用 \`run_resume_diagnosis\`。threadId=${conv?.threadId ?? '?'}`
        : `数据库 purpose=${purpose}（问答/诊断）。只读；**禁止**调用写简历工具。threadId=${conv?.threadId ?? '?'}`;

  const webLine = enableWebSearch
    ? '用户已开启联网：可调用 `search_web_context`（需服务端 Tavily Key）。'
    : '用户未开启联网：勿调用 `search_web_context`。';

  const sel = selectedSectionIds?.length
    ? `用户选中的 Section id：${selectedSectionIds.join(', ')}。`
    : '用户未限定 Section。';

  const resumeTitle = resume?.title ?? '（未知）';
  const convTitle = conv?.title?.trim() ? conv.title.trim() : '（无标题）';

  const blocks: string[] = [SOUL_FRAGMENT];
  if (sessionSummaryBlock) {
    blocks.push('', sessionSummaryBlock);
  }
  blocks.push(
    '',
    '【SESSION｜当前线程】',
    `- conversationId: ${conversationId}`,
    `- 标题: ${convTitle}`,
    `- 简历: ${resumeTitle}（resumeId=${resumeId}）`,
    '',
    purposeLine,
    webLine,
    sel,
    '',
    jd
      ? `【USER｜职位描述 JD】\n${jd}`
      : '【USER｜职位描述 JD】（未配置：可依赖用户自述或 load_resume_edit_state）',
    '',
    globalBlock,
    '',
    buildToolsFragment(purpose, enableWebSearch),
    '',
    '领域快照请用工具 `load_resume_edit_state` 获取，勿臆造 Section 内容。',
  );

  return blocks.join('\n');
}
