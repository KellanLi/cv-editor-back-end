import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { createHash } from 'node:crypto';
import { PrismaService } from '@/provider/prisma/prisma.service';
import {
  AiContextCompactionJobStatus,
  AiMessageRole,
} from '@/generated/enums';

@Injectable()
export class ContextCompactionWorkerService {
  private readonly logger = new Logger(ContextCompactionWorkerService.name);
  private readonly tickMs: number;
  private ticking = false;
  private lastRunAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const v = this.config.get<number>('longContext.workerIntervalMs');
    this.tickMs = typeof v === 'number' && v >= 3000 ? v : 10_000;
  }

  @Interval(5000)
  async tick(): Promise<void> {
    if (this.ticking) {
      return;
    }
    const now = Date.now();
    if (this.lastRunAt !== 0 && now - this.lastRunAt < this.tickMs) {
      return;
    }
    this.lastRunAt = now;
    this.ticking = true;
    try {
      await this.processNextJob();
    } catch (e) {
      this.logger.warn(
        `compaction worker tick: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      this.ticking = false;
    }
  }

  private buildSummarizerLlm(): ChatOpenAI | null {
    const apiKey = this.config.get<string>('ai.openaiApiKey')?.trim();
    if (!apiKey) {
      return null;
    }
    const modelName = this.config.get<string>('ai.openaiModel') ?? 'qwen3.5-plus';
    const baseURL =
      this.config.get<string>('ai.openaiBaseUrl') ??
      'https://dashscope.aliyuncs.com/compatible-mode/v1';
    return new ChatOpenAI({
      apiKey,
      model: modelName,
      temperature: 0.2,
      maxTokens: 2048,
      configuration: { baseURL },
    });
  }

  private async claimNextJob() {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.aiContextCompactionJob.findFirst({
        where: {
          status: AiContextCompactionJobStatus.PENDING,
          OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
        },
        orderBy: { createdAt: 'asc' },
      });
      if (!job) {
        return null;
      }
      const upd = await tx.aiContextCompactionJob.updateMany({
        where: {
          id: job.id,
          status: AiContextCompactionJobStatus.PENDING,
        },
        data: {
          status: AiContextCompactionJobStatus.RUNNING,
          startedAt: new Date(),
          lockedAt: new Date(),
        },
      });
      if (upd.count !== 1) {
        return null;
      }
      return job;
    });
  }

  private async processNextJob(): Promise<void> {
    const job = await this.claimNextJob();
    if (!job) {
      return;
    }

    try {
      const summary = await this.prisma.aiConversationContextSummary.findUnique({
        where: { conversationId: job.conversationId },
        select: { coversUpToSeq: true },
      });
      const covers = summary?.coversUpToSeq ?? 0;
      if (covers >= job.toSeq) {
        await this.prisma.aiContextCompactionJob.update({
          where: { id: job.id },
          data: {
            status: AiContextCompactionJobStatus.SUCCEEDED,
            finishedAt: new Date(),
          },
        });
        return;
      }

      const effectiveFrom = Math.max(job.fromSeq, covers + 1);
      if (effectiveFrom > job.toSeq) {
        await this.prisma.aiContextCompactionJob.update({
          where: { id: job.id },
          data: {
            status: AiContextCompactionJobStatus.SUCCEEDED,
            finishedAt: new Date(),
          },
        });
        return;
      }

      const rows = await this.prisma.aiMessage.findMany({
        where: {
          conversationId: job.conversationId,
          seq: { gte: effectiveFrom, lte: job.toSeq },
          role: { in: [AiMessageRole.user, AiMessageRole.assistant] },
        },
        orderBy: { seq: 'asc' },
        select: { seq: true, role: true, text: true },
      });

      if (rows.length === 0) {
        await this.prisma.aiContextCompactionJob.update({
          where: { id: job.id },
          data: {
            status: AiContextCompactionJobStatus.SUCCEEDED,
            finishedAt: new Date(),
          },
        });
        return;
      }

      const transcript = rows
        .map((m) => `${m.role}#${m.seq}: ${(m.text ?? '').slice(0, 50_000)}`)
        .join('\n');
      const sourceHash = createHash('sha256').update(transcript).digest('hex');

      const llm = this.buildSummarizerLlm();
      if (!llm) {
        await this.failJob(
          job.id,
          job.attempts,
          job.maxAttempts,
          'missing_ai_openai_api_key',
        );
        return;
      }

      const res = await llm.invoke([
        new HumanMessage(
          [
            '你是简历编辑对话的「历史折叠」摘要器。将下列按时间排序的用户/助手消息压缩为一段简体中文要点摘要：',
            '- 保留：用户目标、已确认的简历修改结论、未解决的待办、重要约束与拒绝事项。',
            '- 省略：寒暄、重复尝试、与简历无关的闲聊。',
            '- 不要编造未出现的工具结果；不确定写「原文未明确」。',
            '',
            transcript,
          ].join('\n'),
        ),
      ]);

      const summaryTextRaw =
        typeof res.content === 'string'
          ? res.content
          : Array.isArray(res.content)
            ? res.content
                .map((p) => {
                  if (
                    p &&
                    typeof p === 'object' &&
                    'type' in p &&
                    (p as { type: string }).type === 'text' &&
                    'text' in p
                  ) {
                    return String((p as { text: string }).text);
                  }
                  return '';
                })
                .join('')
            : '';
      const summaryText = summaryTextRaw.trim().slice(0, 24_000);
      if (!summaryText) {
        await this.failJob(
          job.id,
          job.attempts,
          job.maxAttempts,
          'empty_llm_summary',
        );
        return;
      }

      const startSeq = rows[0]!.seq;
      const endSeq = rows[rows.length - 1]!.seq;

      await this.prisma.$transaction(async (tx) => {
        const current = await tx.aiConversationContextSummary.findUnique({
          where: { conversationId: job.conversationId },
        });
        const prevCovers = current?.coversUpToSeq ?? 0;
        const prevRoll = current?.rollingSummary?.trim() ?? '';
        const block = `【折叠 seq ${startSeq}–${endSeq}】\n${summaryText}`;
        const merged = (prevRoll ? `${prevRoll}\n\n${block}` : block).slice(
          0,
          60_000,
        );
        const nextCovers = Math.max(prevCovers, endSeq);

        await tx.aiContextChunk.create({
          data: {
            conversationId: job.conversationId,
            startSeq,
            endSeq,
            summary: summaryText,
            producedByJobId: job.id,
            sourceHash,
          },
        });

        await tx.aiConversationContextSummary.upsert({
          where: { conversationId: job.conversationId },
          create: {
            conversationId: job.conversationId,
            rollingSummary: merged,
            coversUpToSeq: nextCovers,
            version: 0,
          },
          update: {
            rollingSummary: merged,
            coversUpToSeq: nextCovers,
            version: { increment: 1 },
          },
        });

        await tx.aiContextCompactionJob.update({
          where: { id: job.id },
          data: {
            status: AiContextCompactionJobStatus.SUCCEEDED,
            finishedAt: new Date(),
          },
        });
      });
    } catch (e) {
      await this.failJob(
        job.id,
        job.attempts,
        job.maxAttempts,
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  private async failJob(
    jobId: number,
    attempts: number,
    maxAttempts: number,
    lastError: string,
  ): Promise<void> {
    const nextAttempts = attempts + 1;
    const terminal = nextAttempts >= maxAttempts;
    await this.prisma.aiContextCompactionJob.update({
      where: { id: jobId },
      data: {
        attempts: nextAttempts,
        lastError: lastError.slice(0, 8000),
        status: terminal
          ? AiContextCompactionJobStatus.FAILED
          : AiContextCompactionJobStatus.PENDING,
        finishedAt: terminal ? new Date() : null,
        scheduledAt: terminal ? null : new Date(Date.now() + 30_000),
        lockedAt: null,
        ...(terminal ? {} : { startedAt: null }),
      },
    });
  }
}
