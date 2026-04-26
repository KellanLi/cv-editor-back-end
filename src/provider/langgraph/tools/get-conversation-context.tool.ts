import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { PrismaService } from '@/provider/prisma/prisma.service';
import { formatMessageRowsForCompaction } from '../long-context/ai-message-to-messages.util';

const inputSchema = z.object({
  fromSeq: z.number().int().min(1).describe('起始 seq（含）'),
  toSeq: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('结束 seq（含）；缺省时仅取 fromSeq 一条'),
  includeChunkSummaries: z
    .boolean()
    .optional()
    .describe('是否附带与区间重叠的 context chunk 摘要'),
});

/**
 * 按 `seq` 从当前对话拉取已存库消息（经 ACL），用于需要精确回顾某段历史时；与 `rollingSummary` 及近期窗口互补。
 */
export function createGetConversationContextTool(
  prisma: PrismaService,
  ctx: { conversationId: number; userId: number },
) {
  return tool(
    async (args) => {
      const p = inputSchema.parse(args);
      const to = p.toSeq ?? p.fromSeq;
      if (p.fromSeq > to) {
        return 'get_conversation_context: fromSeq 不能大于 toSeq。';
      }
      const c = await prisma.aiConversation.findFirst({
        where: { id: ctx.conversationId, resume: { userId: ctx.userId } },
        select: { id: true },
      });
      if (!c) {
        return 'get_conversation_context: 当前对话不存在或无权访问。';
      }
      const rows = await prisma.aiMessage.findMany({
        where: {
          conversationId: ctx.conversationId,
          seq: { gte: p.fromSeq, lte: to },
        },
        orderBy: { seq: 'asc' },
        include: { toolCalls: true },
        take: 200,
      });
      if (rows.length === 0) {
        return '该 seq 段尚无消息。';
      }
      let out = `【seq ${String(p.fromSeq)}–${String(to)} 原文】\n${formatMessageRowsForCompaction(rows)}`;
      if (p.includeChunkSummaries) {
        const chunks = await prisma.aiContextChunk.findMany({
          where: {
            conversationId: ctx.conversationId,
            startSeq: { lte: to },
            endSeq: { gte: p.fromSeq },
          },
          orderBy: { startSeq: 'asc' },
          take: 20,
        });
        if (chunks.length > 0) {
          out += `\n\n【对应区间已生成压缩块】\n${chunks
            .map(
              (k) =>
                `seq ${String(k.startSeq)}–${String(k.endSeq)}: ${k.summary.slice(0, 2000)}${k.summary.length > 2000 ? '…' : ''}`,
            )
            .join('\n\n')}`;
        }
      }
      if (out.length > 50_000) {
        return `${out.slice(0, 50_000)}…（已截断）`;
      }
      return out;
    },
    {
      name: 'get_conversation_context',
      description:
        '从当前对话线程中按 `seq` 拉取已落库的历史消息转写，用于需精确回顾、引用或核对某几轮时。' +
        '长对话的「已折叠」部分平时在 system 的摘要中；本工具可补充原文。`includeChunkSummaries` 为真时附带与区间重叠的压缩块摘要。',
      schema: inputSchema,
    },
  );
}
