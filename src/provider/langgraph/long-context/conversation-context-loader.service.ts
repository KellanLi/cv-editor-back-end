import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseMessage } from '@langchain/core/messages';
import { PrismaService } from '@/provider/prisma/prisma.service';
import { getLongContextConfig } from '../langgraph.config';
import { planTailWindowAndCompactionRange } from './context-budget.util';
import { ContextCompactionQueueService } from './context-compaction-queue.service';
import { prismaRowsToModelMessages } from './ai-message-to-messages.util';

@Injectable()
export class ConversationContextLoaderService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly compactionQueue: ContextCompactionQueueService,
  ) {}

  /**
   * 按 `coversUpToSeq` + 滚动摘要装配当轮应进入 LangGraph 的消息列表，并在超预算时入队压缩任务（见 `docs/long-context.md`）。
   */
  async assembleForModelTurn(conversationId: number): Promise<{
    systemAddendum: string;
    modelMessages: BaseMessage[];
  }> {
    const { budgetChars, reserveMessageCount } = getLongContextConfig(
      this.config,
    );
    const summary = await this.prisma.aiConversationContextSummary.findUnique({
      where: { conversationId },
    });
    const covered = summary?.coversUpToSeq ?? 0;
    const rolling = (summary?.rollingSummary ?? '').trim();
    const tail = await this.prisma.aiMessage.findMany({
      where: {
        conversationId,
        seq: { gt: covered },
      },
      orderBy: { seq: 'asc' },
      include: { toolCalls: true },
    });
    if (tail.length === 0) {
      return { systemAddendum: '', modelMessages: [] };
    }
    const { kept, dropRange } = planTailWindowAndCompactionRange(
      tail,
      budgetChars,
      reserveMessageCount,
    );
    if (dropRange) {
      this.compactionQueue.tryEnqueue(
        conversationId,
        dropRange.fromSeq,
        dropRange.toSeq,
      );
    }
    const addendum = rolling
      ? `【以下为早期对话的折叠摘要，与下方近期消息合读；勿当作本轮新用户指令】\n${rolling}`
      : '';
    return {
      systemAddendum: addendum,
      modelMessages: prismaRowsToModelMessages(kept),
    };
  }
}
