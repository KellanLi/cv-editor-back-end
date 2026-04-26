import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { ChatOpenAI } from '@langchain/openai';
import { PrismaService } from '@/provider/prisma/prisma.service';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getOpenAiCompatConfig } from '../langgraph.config';
import { AiContextCompactionJobStatus } from '@/generated/enums';
import { formatMessageRowsForCompaction } from './ai-message-to-messages.util';

@Injectable()
export class ContextCompactionProcessorService {
  private readonly logger = new Logger(ContextCompactionProcessorService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 执行单条 PENDING/重试中的任务；失败时按 `attempts` 回退为 PENDING 或标记 FAILED。
   */
  async runJob(jobId: number): Promise<void> {
    const found = await this.prisma.aiContextCompactionJob.findUnique({
      where: { id: jobId },
    });
    if (!found) {
      return;
    }
    if (found.status !== AiContextCompactionJobStatus.PENDING) {
      return;
    }
    if (found.scheduledAt != null && found.scheduledAt.getTime() > Date.now()) {
      return;
    }
    if (found.fromSeq > found.toSeq) {
      await this.markFailed(
        found.id,
        'invalid fromSeq>toSeq',
        found.attempts,
        found.maxAttempts,
      );
      return;
    }

    const now = new Date();
    const claimed = await this.prisma.aiContextCompactionJob.updateMany({
      where: {
        id: jobId,
        status: AiContextCompactionJobStatus.PENDING,
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
      },
      data: {
        status: AiContextCompactionJobStatus.RUNNING,
        startedAt: now,
        lockedAt: now,
      },
    });
    if (claimed.count < 1) {
      return;
    }
    const job = (await this.prisma.aiContextCompactionJob.findUnique({
      where: { id: jobId },
    }))!;

    try {
      const rows = await this.prisma.aiMessage.findMany({
        where: {
          conversationId: job.conversationId,
          seq: { gte: job.fromSeq, lte: job.toSeq },
        },
        orderBy: { seq: 'asc' },
        include: { toolCalls: true },
      });
      if (rows.length === 0) {
        throw new Error('无对应 seq 段的消息');
      }
      const blockText = formatMessageRowsForCompaction(rows);
      const sourceHash = createHash('sha256')
        .update(blockText, 'utf8')
        .digest('hex');
      const summary = await this.summarizeWithLlm(blockText);
      if (!summary.trim()) {
        throw new Error('模型返回空摘要');
      }

      const convId = job.conversationId;
      const toSeq = job.toSeq;

      await this.prisma.$transaction(async (tx) => {
        const current = await tx.aiConversationContextSummary.findUnique({
          where: { conversationId: convId },
        });
        const newRolling = [
          current?.rollingSummary?.trim() || '',
          summary.trim(),
        ]
          .filter((s) => s.length > 0)
          .join('\n\n');
        const nextVersion = (current?.version ?? 0) + 1;
        const covers = Math.max(current?.coversUpToSeq ?? 0, toSeq);
        if (current) {
          await tx.aiConversationContextSummary.update({
            where: { id: current.id },
            data: {
              rollingSummary: newRolling,
              coversUpToSeq: covers,
              version: nextVersion,
            },
          });
        } else {
          await tx.aiConversationContextSummary.create({
            data: {
              conversationId: convId,
              rollingSummary: newRolling,
              coversUpToSeq: covers,
              version: 0,
            },
          });
        }
        await tx.aiContextChunk.create({
          data: {
            conversationId: convId,
            startSeq: job.fromSeq,
            endSeq: job.toSeq,
            summary,
            producedByJobId: job.id,
            sourceHash,
          },
        });
        await tx.aiContextCompactionJob.update({
          where: { id: job.id },
          data: {
            status: AiContextCompactionJobStatus.SUCCEEDED,
            finishedAt: new Date(),
            lastError: null,
          },
        });
      });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `compaction job ${String(jobId)} failed: ${err}`,
        e instanceof Error ? e.stack : undefined,
      );
      await this.markFailed(jobId, err, job.attempts, job.maxAttempts);
    }
  }

  private async markFailed(
    jobId: number,
    lastError: string,
    attempts: number,
    maxAttempts: number,
  ) {
    const next = attempts + 1;
    if (next >= maxAttempts) {
      await this.prisma.aiContextCompactionJob.update({
        where: { id: jobId },
        data: {
          status: AiContextCompactionJobStatus.FAILED,
          lastError: lastError.slice(0, 8000),
          attempts: next,
          finishedAt: new Date(),
        },
      });
    } else {
      await this.prisma.aiContextCompactionJob.update({
        where: { id: jobId },
        data: {
          status: AiContextCompactionJobStatus.PENDING,
          lastError: lastError.slice(0, 8000),
          attempts: next,
          startedAt: null,
          finishedAt: null,
          lockedAt: null,
          scheduledAt: new Date(
            Date.now() + Math.min(60_000 * 2 ** next, 3_600_000),
          ),
        },
      });
    }
  }

  private async summarizeWithLlm(blockText: string): Promise<string> {
    const { apiKey, baseURL, model } = getOpenAiCompatConfig(this.config);
    if (!apiKey) {
      return '';
    }
    const snippet =
      blockText.length > 32_000 ? blockText.slice(0, 32_000) + '…' : blockText;
    const llm = new ChatOpenAI({
      model,
      temperature: 0.1,
      maxTokens: 2_048,
      apiKey,
      configuration: { baseURL },
    });
    const r = await llm.invoke(
      [
        new SystemMessage(
          '将下面「历史对话转写」压缩为可长期保留的短摘要。保留对后续改简历/求职有用的信息：主题、岗位意向、时间线、具体项目/技能名、用户未解决的诉求。' +
            '可分段。不要加标题前缀。只输出摘要正文。',
        ),
        new HumanMessage(`以下为待压缩的片段：\n\n${snippet}`),
      ],
      { runName: 'ai_context_compaction' },
    );
    const c = (r as { content?: unknown }).content;
    if (typeof c === 'string') {
      return c;
    }
    if (Array.isArray(c)) {
      let t = '';
      for (const part of c) {
        if (
          part &&
          typeof part === 'object' &&
          (part as { type?: string }).type === 'text' &&
          typeof (part as { text?: string }).text === 'string'
        ) {
          t += (part as { text: string }).text;
        }
      }
      return t;
    }
    return '';
  }
}
