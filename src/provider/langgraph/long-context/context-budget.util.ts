import type { MsgWithToolCalls } from './ai-message-to-messages.util';

export function estimateMessagesChars(
  messages: Array<{
    text: string | null;
    contentJson: unknown;
  }>,
): number {
  let c = 0;
  for (const m of messages) {
    c += m.text?.length ?? 0;
    if (m.contentJson != null) {
      c += JSON.stringify(m.contentJson).length;
    }
  }
  return c;
}

/**
 * 在 `seq` 已升序的未覆盖段 `tail` 上，优先保证尾部「最近 reserveMessageCount 条」尽量入模；
 * 若总字符超 `budgetChars`，从头部逐段让位给压缩任务，直至尾部子列落在预算内（可能缩小保留条数）。
 * 若仍无法将单条消息压进预算，则只保留最后一条，并将前面整段标为可压缩范围。
 */
export function planTailWindowAndCompactionRange(
  tail: MsgWithToolCalls[],
  budgetChars: number,
  reserveMessageCount: number,
): {
  kept: MsgWithToolCalls[];
  dropRange: { fromSeq: number; toSeq: number } | null;
} {
  if (tail.length === 0) {
    return { kept: [], dropRange: null };
  }

  let take = Math.min(reserveMessageCount, tail.length);
  while (take > 0) {
    const kept = tail.slice(-take);
    if (estimateMessagesChars(kept) <= budgetChars) {
      if (tail.length > take) {
        const dropped = tail.slice(0, tail.length - take);
        return {
          kept,
          dropRange: {
            fromSeq: dropped[0].seq,
            toSeq: dropped[dropped.length - 1].seq,
          },
        };
      }
      return { kept, dropRange: null };
    }
    take -= 1;
  }

  const last = tail[tail.length - 1];
  if (tail.length > 1) {
    return {
      kept: [last],
      dropRange: { fromSeq: tail[0].seq, toSeq: tail[tail.length - 2].seq },
    };
  }
  return { kept: [last], dropRange: null };
}

export function makeCompactionIdempotencyKey(
  conversationId: number,
  fromSeq: number,
  toSeq: number,
): string {
  return `conv-${conversationId}-${fromSeq}-${toSeq}`;
}
