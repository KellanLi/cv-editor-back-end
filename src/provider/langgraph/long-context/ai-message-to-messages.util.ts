import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import type {
  AiMessage as Pm,
  AiMessageRole,
  AiToolCall,
} from '@/generated/client';

export type MsgWithToolCalls = Pm & { toolCalls: AiToolCall[] };

/**
 * 将已落库的 `AiMessage` 转为 LangChain 消息。
 */
export function prismaAiMessageToBaseMessage(m: MsgWithToolCalls): BaseMessage {
  if (m.role === 'user') {
    return new HumanMessage(m.text ?? '');
  }
  if (m.role === 'assistant') {
    const t = m.text ?? '';
    if (m.toolCalls && m.toolCalls.length > 0) {
      return new AIMessage(
        `${t}\n[tool_invocations] ${JSON.stringify(
          m.toolCalls.map((tc) => ({
            name: tc.name,
            input: tc.input,
            status: tc.status,
          })),
        )}`,
      );
    }
    return new AIMessage(t);
  }
  if (m.role === 'system') {
    return new SystemMessage(m.text ?? '');
  }
  if (m.role === 'tool') {
    const pm = m.providerMeta as
      | { toolCallId?: string; openaiCallId?: string }
      | null
      | undefined;
    const toolCallId =
      (typeof pm?.toolCallId === 'string' && pm.toolCallId) ||
      (typeof pm?.openaiCallId === 'string' && pm.openaiCallId) ||
      `toolmsg_${m.id}`;
    return new ToolMessage({ content: m.text ?? '', tool_call_id: toolCallId });
  }
  return new HumanMessage(
    `（未识别角色 ${(m as { role: AiMessageRole }).role}）\n${m.text ?? ''}`,
  );
}

export function prismaRowsToModelMessages(
  msgs: MsgWithToolCalls[],
): BaseMessage[] {
  return msgs.map((x) => prismaAiMessageToBaseMessage(x));
}

/**
 * 供压缩 LLM 调用的平文本
 */
export function formatMessageRowsForCompaction(
  msgs: MsgWithToolCalls[],
): string {
  const parts: string[] = [];
  for (const m of msgs) {
    const text = m.text != null && m.text !== '' ? m.text : '';
    const extra = m.contentJson
      ? `\n[content_json] ${JSON.stringify(m.contentJson)}`
      : '';
    parts.push(`[${m.role}] ${text}${extra}`);
  }
  return parts.join('\n\n');
}
