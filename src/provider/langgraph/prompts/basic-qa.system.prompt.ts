import { PrismaService } from '@/provider/prisma/prisma.service';
import type { IJwtPayload } from '@/types/auth.types';
import { AiConversationPurpose } from '@/generated/enums';
import { buildAgentSystemPrompt } from '@/provider/langgraph/memory';

/**
 * 基础问答 / 编辑 Agent 的系统提示（进线 Memory：见 `memory-implementation.md`）。
 */
export async function buildBasicQaSystemPrompt(
  prisma: PrismaService,
  resumeId: number,
  jwt: IJwtPayload,
  options: {
    conversationId: number;
    selectedSectionIds?: number[];
    enableWebSearch: boolean;
    purpose: AiConversationPurpose;
    preloadedSessionSummary?: {
      rollingSummary: string | null;
      coversUpToSeq: number;
    } | null;
  },
): Promise<string> {
  return buildAgentSystemPrompt({
    prisma,
    resumeId,
    conversationId: options.conversationId,
    jwt,
    selectedSectionIds: options.selectedSectionIds,
    enableWebSearch: options.enableWebSearch,
    purpose: options.purpose,
    preloadedSessionSummary: options.preloadedSessionSummary,
  });
}
