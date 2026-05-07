import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/provider/prisma/prisma.service';
import { AiMessageRole } from '@/generated/enums';

export type CompactionSeqRange = { fromSeq: number; toSeq: number };

const MAX_ROWS_FOR_BUDGET_SCAN = 8000;

function estimateMessageChars(text: string | null): number {
  return (text ?? '').length;
}

@Injectable()
export class ContextBudgetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private budgetChars(): number {
    const v = this.config.get<number>('longContext.budgetChars');
    return typeof v === 'number' && v > 0 ? v : 72_000;
  }

  private preserveRecentMessages(): number {
    const v = this.config.get<number>('longContext.preserveRecentMessages');
    return typeof v === 'number' && v > 0 ? v : 16;
  }

  /**
   * 若「已覆盖之后」的 user/assistant 明文总字符超预算，则给出待异步折叠的闭区间
   * `[fromSeq, toSeq]`，且**不**包含近期保留尾窗。
   */
  async computeCompactionRange(
    conversationId: number,
  ): Promise<CompactionSeqRange | null> {
    const summary = await this.prisma.aiConversationContextSummary.findUnique({
      where: { conversationId },
      select: { coversUpToSeq: true },
    });
    const covers = summary?.coversUpToSeq ?? 0;

    const rows = await this.prisma.aiMessage.findMany({
      where: {
        conversationId,
        role: { in: [AiMessageRole.user, AiMessageRole.assistant] },
        ...(covers > 0 ? { seq: { gt: covers } } : {}),
      },
      orderBy: { seq: 'asc' },
      take: MAX_ROWS_FOR_BUDGET_SCAN,
      select: { seq: true, text: true },
    });

    if (rows.length === 0) {
      return null;
    }

    let total = 0;
    for (const r of rows) {
      total += estimateMessageChars(r.text);
    }
    if (rows.length >= MAX_ROWS_FOR_BUDGET_SCAN) {
      total += 1_000_000;
    }

    if (total <= this.budgetChars()) {
      return null;
    }

    const P = this.preserveRecentMessages();
    const n = rows.length;

    if (n > P) {
      const head = rows.slice(0, n - P);
      return {
        fromSeq: head[0]!.seq,
        toSeq: head[head.length - 1]!.seq,
      };
    }

    const leave = Math.min(2, n);
    if (n <= leave) {
      return null;
    }
    const foldable = rows.slice(0, n - leave);
    return {
      fromSeq: foldable[0]!.seq,
      toSeq: foldable[foldable.length - 1]!.seq,
    };
  }
}
