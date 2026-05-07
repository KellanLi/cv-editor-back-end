import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/provider/prisma/prisma.service';
import { loadSessionMessagesForAgent } from '@/provider/langgraph/memory';

/**
 * 主链路读取：滚动摘要 + `coversUpToSeq` 之后的消息，再按工作集截断。
 * 实现委托 `loadSessionMessagesForAgent`，便于日后与压缩 Worker 的读策略集中演进。
 */
@Injectable()
export class ConversationContextLoaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async loadForTurn(
    conversationId: number,
    options?: { maxRecent?: number },
  ): Promise<Awaited<ReturnType<typeof loadSessionMessagesForAgent>>> {
    const configured = this.config.get<number>('longContext.maxRecentForAgent');
    const maxRecent =
      options?.maxRecent ??
      (typeof configured === 'number' && configured > 0 ? configured : 48);
    return loadSessionMessagesForAgent(this.prisma, conversationId, {
      maxRecent,
    });
  }
}
