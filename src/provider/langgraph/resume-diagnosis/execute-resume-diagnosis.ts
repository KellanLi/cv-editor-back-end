import { Logger } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { PrismaService } from '@/provider/prisma/prisma.service';
import { tavilySearch } from '@/provider/langgraph/skills/tool-helpers';
import type {
  JdSource,
  ResumeDiagnosisReport,
} from './resume-diagnosis.types';

const log = new Logger('ResumeDiagnosis');

export type ExecuteResumeDiagnosisParams = {
  prisma: PrismaService;
  userId: number;
  resumeId: number;
  /** 无 JD 时用于检索/推断；可空，将尝试 `ResumeProfile.targetPosition` 与简历标题 */
  targetRole?: string;
  enableWebSearch: boolean;
  tavilyApiKey: string;
  llm: { apiKey: string; baseUrl: string; model: string };
};

function buildModel(p: ExecuteResumeDiagnosisParams['llm']) {
  return new ChatOpenAI({
    apiKey: p.apiKey,
    model: p.model,
    temperature: 0.25,
    maxTokens: 6144,
    configuration: { baseURL: p.baseUrl },
  });
}

function textFromMessageContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (
          part &&
          typeof part === 'object' &&
          'type' in part &&
          (part as { type: string }).type === 'text' &&
          'text' in part
        ) {
          return String((part as { text: string }).text);
        }
        return '';
      })
      .join('');
  }
  return '';
}

function stripJsonFence(s: string): string {
  const t = s.trim();
  if (t.startsWith('```')) {
    return t
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/u, '')
      .trim();
  }
  return t;
}

function parseDiagnosisJson(raw: string): Partial<ResumeDiagnosisReport> {
  const s = stripJsonFence(raw);
  const o = JSON.parse(s) as Record<string, unknown>;
  return {
    writingApproach: String(o.writingApproach ?? ''),
    evaluationDimensions: Array.isArray(o.evaluationDimensions)
      ? (o.evaluationDimensions as { name?: string; description?: string }[]).map(
          (d) => ({
            name: String(d.name ?? ''),
            description: String(d.description ?? ''),
          }),
        )
      : [],
    dimensionScores: Array.isArray(o.dimensionScores)
      ? (o.dimensionScores as { name?: string; score?: number; comment?: string }[]).map(
          (d) => ({
            name: String(d.name ?? ''),
            score: Number(d.score ?? 0),
            comment: String(d.comment ?? ''),
          }),
        )
      : [],
    overallScore: Number(o.overallScore ?? 0),
    overallComment: String(o.overallComment ?? ''),
    contentSuggestions: Array.isArray(o.contentSuggestions)
      ? (
          o.contentSuggestions as {
            sectionId?: number;
            contentOrder?: number;
            operation?: string;
            reason?: string;
            suggestion?: string;
          }[]
        )
          .map((c) => ({
            sectionId: Number(c.sectionId ?? 0),
            contentOrder: Number(c.contentOrder ?? 0),
            operation: normalizeOp(c.operation),
            reason: String(c.reason ?? ''),
            suggestion: String(c.suggestion ?? ''),
          }))
          .filter((c) => c.sectionId > 0)
      : [],
    overallAddSuggestions: Array.isArray(o.overallAddSuggestions)
      ? (
          o.overallAddSuggestions as {
            target?: string;
            sectionId?: number | null;
            reason?: string;
            suggestion?: string;
          }[]
        ).map((a) => ({
          target:
            a.target === 'section' ? ('section' as const) : ('resume' as const),
          sectionId:
            a.sectionId === undefined || a.sectionId === null
              ? null
              : Number(a.sectionId),
          reason: String(a.reason ?? ''),
          suggestion: String(a.suggestion ?? ''),
        }))
      : [],
  };
}

function normalizeOp(
  op: string | undefined,
): 'delete' | 'expand' | 'simplify' {
  const x = String(op ?? '').toLowerCase();
  if (x === 'delete' || x === 'expand' || x === 'simplify') return x;
  return 'simplify';
}

async function synthesizeJdFromSearch(
  model: ChatOpenAI,
  queryLabel: string,
  searchBlob: string,
): Promise<string> {
  const res = await model.invoke([
    new HumanMessage(
      [
        `请根据下列与「${queryLabel}」相关的检索摘要，整理成一份**虚构但结构完整**的职位描述（JD），包含：岗位职责、任职要求、加分项。`,
        '使用简体中文，条目清晰，总长度 400～1200 字。不要说明信息来源。',
        '',
        searchBlob.slice(0, 12_000),
      ].join('\n'),
    ),
  ]);
  return textFromMessageContent(res.content).trim();
}

function compactResumeForPrompt(payload: {
  resumeTitle: string;
  targetPosition: string | null;
  sections: {
    id: number;
    order: number;
    templateName: string;
    contents: { order: number; text: string }[];
  }[];
}): string {
  const lines: string[] = [
    `简历标题: ${payload.resumeTitle}`,
    payload.targetPosition
      ? `目标岗位(档案): ${payload.targetPosition}`
      : '目标岗位(档案): （未填）',
    '---',
  ];
  for (const s of payload.sections) {
    lines.push(
      `Section id=${s.id} order=${s.order} 模块类型=${s.templateName}`,
    );
    for (const c of s.contents) {
      lines.push(`  Content order=${c.order}:\n${c.text.slice(0, 2500)}`);
    }
  }
  return lines.join('\n');
}

function infoValuesToText(values: unknown): string {
  try {
    return JSON.stringify(values).slice(0, 800);
  } catch {
    return String(values).slice(0, 800);
  }
}

/**
 * 简历 AI 诊断：JD 获取/生成 → 编写思路 → 评价维度 → 打分 → 分块修改意见 + 整体增补意见。
 */
export async function executeResumeDiagnosis(
  params: ExecuteResumeDiagnosisParams,
): Promise<ResumeDiagnosisReport> {
  const { prisma, userId, resumeId } = params;
  log.log(`start resumeId=${String(resumeId)} userId=${String(userId)}`);

  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId },
    include: {
      profile: true,
      sections: {
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
        include: {
          contents: {
            orderBy: { order: 'asc' },
            include: { infos: { orderBy: { order: 'asc' } } },
          },
        },
      },
    },
  });

  if (!resume) {
    throw new Error('resume_not_found');
  }

  const templateIds = [...new Set(resume.sections.map((s) => s.contentTemplateId))];
  /** Prisma 对 `in: []` 会抛验证错误，无 Section 时必须跳过查询 */
  const templates =
    templateIds.length === 0
      ? []
      : await prisma.contentTemplate.findMany({
          where: { id: { in: templateIds }, userId },
          select: { id: true, name: true },
        });
  if (templateIds.length === 0) {
    log.warn(`resumeId=${String(resumeId)} 无 Section，跳过模板名解析`);
  }
  const tidToName = new Map(templates.map((t) => [t.id, t.name]));

  const globalJd = await prisma.aiGlobalContext.findFirst({
    where: { resumeId, key: 'job_description' },
    select: { value: true },
  });

  let jdText = (resume.jobDescriptionText ?? '').trim();
  let jdSource: JdSource = 'missing';
  if (jdText.length > 80) {
    jdSource = 'resume_field';
  } else if (globalJd?.value?.trim()) {
    jdText = globalJd.value.trim();
    jdSource = 'global_context';
  }

  const roleHint =
    (params.targetRole ?? '').trim() ||
    (resume.profile?.targetPosition ?? '').trim() ||
    resume.title;

  const model = buildModel(params.llm);

  if (jdSource === 'missing' && params.enableWebSearch && params.tavilyApiKey) {
    log.log(`jd: 尝试 Tavily 检索 roleHint=${roleHint.slice(0, 80)}`);
    const q = `${roleHint} 招聘 岗位职责 任职要求`;
    const blob = await tavilySearch(q, params.tavilyApiKey);
    let searchUsable = blob.length > 40;
    try {
      const p = JSON.parse(blob) as { ok?: boolean };
      if (p?.ok === false) {
        searchUsable = false;
      }
    } catch {
      /* 成功路径常为纯文本摘要 */
    }
    if (searchUsable) {
      jdText = await synthesizeJdFromSearch(model, roleHint, blob);
      if (jdText.length > 80) {
        jdSource = 'generated_web';
      }
    }
  }

  if (jdSource === 'missing' && jdText.length < 80) {
    log.log('jd: 使用 LLM 推断示例 JD');
    const res = await model.invoke([
      new HumanMessage(
        [
          `用户目标岗位/方向：「${roleHint}」。简历标题：「${resume.title}」。`,
          '当前没有可靠的外部 JD。请**推断**并撰写一份**合理的示例 JD**（岗位职责、任职要求、加分项），简体中文，400～900 字。',
          '明确这是基于岗位方向的推断，供后续简历诊断使用。',
        ].join('\n'),
      ),
    ]);
    jdText = textFromMessageContent(res.content).trim();
    if (jdText.length > 80) {
      jdSource = 'inferred';
    }
  }

  const sectionsPayload = resume.sections.map((s) => ({
    id: s.id,
    order: s.order,
    templateName: tidToName.get(s.contentTemplateId) ?? `模板#${s.contentTemplateId}`,
    contents: s.contents.map((c) => ({
      order: c.order,
      text: c.infos
        .map(
          (i) =>
            `[${i.type}#${i.order}] ${infoValuesToText(i.values)}`,
        )
        .join('\n'),
    })),
  }));

  const resumeBlob = compactResumeForPrompt({
    resumeTitle: resume.title,
    targetPosition: resume.profile?.targetPosition ?? null,
    sections: sectionsPayload,
  });

  const sopPrompt = [
    '你是资深招聘业务顾问与简历教练。请严格按下列 SOP 输出，**只输出一个 JSON 对象**（不要 Markdown 代码围栏，不要前后说明文字）。',
    '',
    'SOP：',
    '1）已提供 JD（可能来自库表、全局上下文或系统生成的推断 JD）。',
    '2）结合 JD 与简历正文，给出「标准简历编写思路」：既要理解求职者意图，也要指出可改进的叙事结构。',
    '3）列出 4～8 条「评价维度」（name + description），需与 JD、岗位匹配。',
    '4）对每个维度打分 dimensionScores：score 为 0～100 整数；comment 简短。',
    '5）overallScore 为 0～100 整数；overallComment 为总体评价。',
    '6）contentSuggestions：针对**每个 Section 下每条 Content**（用 sectionId + contentOrder 对齐下面快照）给出修改意见；每条必须含 operation，只能是 "delete" | "expand" | "simplify"：',
    '   - delete：与应聘岗位关系不大，建议删或极大弱化；',
    '   - expand：内容必要但不足，应对齐 JD 扩写；',
    '   - simplify：有必要但冗余，应提炼要点、压缩篇幅。',
    '7）overallAddSuggestions：仅表达「应增加」类建议（target 为 "resume" 表示缺整块必要模块；为 "section" 表示某 Section 内容过少需补充）；sectionId 可空（resume 级）或填具体 Section id。',
    '',
    'JSON 键名与类型必须如下（注意数组元素字段齐全）：',
    '{',
    '  "writingApproach": string,',
    '  "evaluationDimensions": [ { "name": string, "description": string } ],',
    '  "dimensionScores": [ { "name": string, "score": number, "comment": string } ],',
    '  "overallScore": number,',
    '  "overallComment": string,',
    '  "contentSuggestions": [ { "sectionId": number, "contentOrder": number, "operation": "delete"|"expand"|"simplify", "reason": string, "suggestion": string } ],',
    '  "overallAddSuggestions": [ { "target": "resume"|"section", "sectionId": number|null, "reason": string, "suggestion": string } ]',
    '}',
    '',
    '--- JD ---',
    jdText || '（JD 仍较短或缺失，请结合岗位方向与简历自行把握评价尺度）',
    '',
    '--- 简历结构化快照（sectionId / contentOrder 必须引用这里出现的整数）---',
    resumeBlob,
  ].join('\n');

  log.log(
    `main LLM invoke promptChars≈${String(sopPrompt.length)} jdSource=${jdSource}`,
  );
  const diagRes = await model.invoke([new HumanMessage(sopPrompt)]);
  const diagRaw = textFromMessageContent(diagRes.content);

  let partial: Partial<ResumeDiagnosisReport>;
  try {
    partial = parseDiagnosisJson(diagRaw);
  } catch (parseErr) {
    log.warn(
      `诊断 JSON 解析失败，已降级: ${parseErr instanceof Error ? parseErr.message : String(parseErr)} rawHead=${diagRaw.slice(0, 200)}`,
    );
    partial = {
      writingApproach: diagRaw.slice(0, 2000),
      evaluationDimensions: [],
      dimensionScores: [],
      overallScore: 0,
      overallComment: '模型输出非合法 JSON，请重试或缩短简历后再诊断。',
      contentSuggestions: [],
      overallAddSuggestions: [],
    };
  }

  log.log(`done resumeId=${String(resumeId)} overallScore=${String(partial.overallScore ?? 0)}`);

  return {
    jdText: jdText || '（无）',
    jdSource,
    writingApproach: partial.writingApproach ?? '',
    evaluationDimensions: partial.evaluationDimensions ?? [],
    dimensionScores: partial.dimensionScores ?? [],
    overallScore: partial.overallScore ?? 0,
    overallComment: partial.overallComment ?? '',
    contentSuggestions: partial.contentSuggestions ?? [],
    overallAddSuggestions: partial.overallAddSuggestions ?? [],
  };
}
