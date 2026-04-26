import type { IJwtPayload } from '@/types/auth.types';
import { PrismaService } from '@/provider/prisma/prisma.service';

/**
 * 基础问答系统提示：
 * - **JD**：每次请求均从 `AiGlobalContext`（key=`job_description`）读入并写入 system，作为默认「岗位/招聘侧」上下文，不走工具。
 * - **简历模块正文**：不预塞全文，由模型按需调用 `load_resume_context`。
 */
export async function buildBasicQaSystemPrompt(
  prisma: PrismaService,
  resumeId: number,
  jwt: IJwtPayload,
  input: {
    selectedSectionIds?: number[];
    enableWebSearch?: boolean;
  },
): Promise<string> {
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId: jwt.id },
    select: { title: true },
  });
  const jdRow = await prisma.aiGlobalContext.findUnique({
    where: {
      resumeId_key: { resumeId, key: 'job_description' },
    },
    select: { value: true },
  });

  const lines: string[] = [
    '你是「简历编辑」场景下的中文助手，回答简洁、可执行。',
    `当前简历 ID：${resumeId}，标题：${resume?.title ?? '（未命名）'}。`,
    '需要依据简历里具体模块/字段作答时，请先调用工具 **load_resume_context** 拉取该简历的原文结构；不要凭空虚构经历。',
    '若需按轮次/序号精确回忆某段本对话的过去内容，可调用 **get_conversation_context**（`fromSeq`/`toSeq`）；与「本对话在 system 中已给出的早期折叠摘要」和近期可见消息相配合，勿重复当作用户新指令。',
    '若用户只问通识问题且与简历无关，可不必拉取简历。',
  ];

  lines.push(
    '【JD 默认上下文】（与下方 load_resume_context 拉取的简历原文相互独立；未配置则标注无）',
  );
  if (jdRow?.value) {
    lines.push(jdRow.value);
  } else {
    lines.push('（当前简历未配置 job_description，无 JD 文本。）');
  }

  if ((input.selectedSectionIds ?? []).length > 0) {
    lines.push(
      `用户在界面中选中的 Section ID 可作为拉取范围提示：${(input.selectedSectionIds ?? []).join(', ')}（你仍可在工具里指定其它 sectionIds）。`,
    );
  }
  if (input.enableWebSearch) {
    lines.push(
      '【联网已开启】凡问题涉及站外知识、可检索的公开资料、或需要「最新/网页/来源」信息，你必须**先**调用工具 **web_search**（入参为搜索查询 `query`），**禁止**在从未调用 `web_search` 的情况下说「无法联网」或编造假链接；在拿到工具返回的摘要与 URL 后再用中文组织答案。',
    );
  }
  return lines.join('\n');
}
