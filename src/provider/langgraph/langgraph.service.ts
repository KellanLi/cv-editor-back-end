import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import {
  AIMessage,
  AIMessageChunk,
  HumanMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import type { AiConversationPurpose } from '@/generated/enums';
import { PrismaService } from '@/provider/prisma/prisma.service';
import { SectionService } from '@/modules/section/section.service';
import { buildPrimitiveTools } from './agent-core/build-primitive-tools';

// `moduleResolution: "node"` 不解析 package exports 的 `prebuilt` 子路径；运行时常量仍合法。
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createReactAgent } = require('@langchain/langgraph/prebuilt') as {
  createReactAgent: (params: {
    llm: ChatOpenAI;
    tools: ReturnType<typeof buildPrimitiveTools>;
    prompt: string;
  }) => {
    stream: (
      input: { messages: BaseMessage[] },
      options: { streamMode: readonly ['messages', 'tools'] },
    ) => Promise<AsyncIterable<unknown>>;
  };
};

export type BasicQaStreamEvent =
  | { kind: 'error'; message: string }
  | { kind: 'message'; deltaText: string; payload?: Record<string, unknown> }
  | { kind: 'reasoning'; deltaText: string; payload?: Record<string, unknown> }
  | { kind: 'tool'; payload: unknown };

export type StreamBasicQaInput = {
  threadId: string;
  conversationId: number;
  systemPrompt: string;
  resumeId: number;
  userId: number;
  purpose: AiConversationPurpose;
  /** 与 `SendAiChatDto.userMessage` 一致；无历史时作为唯一 Human 轮 */
  userMessage: string;
  /** 与 `SendAiChatDto.selectedSectionIds` 一致，供 load_resume_edit_state 默认范围 */
  suggestedSectionIds?: number[];
  /** 与 `SendAiChatDto.enableWebSearch` 一致 */
  enableWebSearch: boolean;
  /** 自 DB 组装的 user/assistant 文本历史（含本轮用户消息） */
  historyMessages?: { role: 'user' | 'assistant'; text: string }[];
};

function textFromMessageChunk(msg: AIMessageChunk): string {
  const c = msg.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    return c
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

function reasoningFromChunk(msg: AIMessageChunk): string {
  const k = msg.additional_kwargs as Record<string, unknown> | undefined;
  const r = k?.reasoning_content ?? k?.reasoning;
  return typeof r === 'string' ? r : '';
}

@Injectable()
export class LanggraphService {
  private readonly logger = new Logger(LanggraphService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly sectionService: SectionService,
  ) {}

  async generateConversationTitle(userMessage: string): Promise<string | null> {
    const apiKey = this.config.get<string>('ai.openaiApiKey')?.trim();
    if (!apiKey) {
      return null;
    }
    const modelName =
      this.config.get<string>('ai.openaiModel') ?? 'qwen3.5-plus';
    const baseURL =
      this.config.get<string>('ai.openaiBaseUrl') ??
      'https://dashscope.aliyuncs.com/compatible-mode/v1';
    const model = new ChatOpenAI({
      apiKey,
      model: modelName,
      temperature: 0,
      maxTokens: 64,
      configuration: { baseURL },
    });
    try {
      const res = await model.invoke([
        new HumanMessage(
          `用不超过 24 字的简体中文生成对话标题，只输出标题本身，不要引号或前缀说明：\n${userMessage.slice(0, 2000)}`,
        ),
      ]);
      const raw =
        typeof res.content === 'string'
          ? res.content
          : Array.isArray(res.content)
            ? res.content
                .map((p) =>
                  p &&
                  typeof p === 'object' &&
                  'text' in p &&
                  typeof (p as { text: unknown }).text === 'string'
                    ? (p as { text: string }).text
                    : '',
                )
                .join('')
            : '';
      const t = raw.replace(/\s+/g, ' ').trim();
      return t ? t.slice(0, 60) : null;
    } catch (e) {
      this.logger.warn(
        `generateConversationTitle failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }

  private buildChatModel() {
    const apiKey = this.config.get<string>('ai.openaiApiKey')?.trim();
    if (!apiKey) {
      return null;
    }
    const modelName =
      this.config.get<string>('ai.openaiModel') ?? 'qwen3.5-plus';
    const baseURL =
      this.config.get<string>('ai.openaiBaseUrl') ??
      'https://dashscope.aliyuncs.com/compatible-mode/v1';
    return new ChatOpenAI({
      apiKey,
      model: modelName,
      temperature: 0.2,
      streaming: true,
      configuration: { baseURL },
    });
  }

  async *streamBasicQa(
    input: StreamBasicQaInput,
  ): AsyncGenerator<BasicQaStreamEvent, void, void> {
    const model = this.buildChatModel();
    if (!model) {
      yield {
        kind: 'error',
        message:
          '未配置大模型 API Key，无法运行 AgentCore。请设置 DASHSCOPE_API_KEY（推荐）或 OPENAI_API_KEY（兼容名）为阿里云百炼 / DashScope 的 Key 后重试。',
      };
      return;
    }

    const tavilyKey = this.config.get<string>('ai.tavilyApiKey')?.trim() ?? '';
    const apiKey = this.config.get<string>('ai.openaiApiKey')?.trim() ?? '';
    const tools = buildPrimitiveTools({
      prisma: this.prisma,
      sectionService: this.sectionService,
      userId: input.userId,
      resumeId: input.resumeId,
      purpose: input.purpose,
      suggestedSectionIds: input.suggestedSectionIds,
      enableWebSearch: input.enableWebSearch,
      tavilyApiKey: tavilyKey,
      llmConfig:
        apiKey ?
          {
            apiKey,
            baseUrl:
              this.config.get<string>('ai.openaiBaseUrl') ??
              'https://dashscope.aliyuncs.com/compatible-mode/v1',
            model:
              this.config.get<string>('ai.openaiModel') ?? 'qwen3.5-plus',
          }
        : undefined,
    });

    const graph = createReactAgent({
      llm: model,
      tools,
      prompt: input.systemPrompt,
    });

    const messages: BaseMessage[] = input.historyMessages?.length
      ? input.historyMessages.map((m) =>
          m.role === 'user' ? new HumanMessage(m.text) : new AIMessage(m.text),
        )
      : [new HumanMessage(input.userMessage)];

    try {
      const stream = await graph.stream(
        { messages },
        { streamMode: ['messages', 'tools'] as const },
      );

      for await (const chunk of stream) {
        if (!Array.isArray(chunk)) {
          continue;
        }
        let mode: unknown;
        let payload: unknown;
        if (chunk.length === 2) {
          mode = chunk[0];
          payload = chunk[1];
        } else if (chunk.length === 3) {
          mode = chunk[1];
          payload = chunk[2];
        } else {
          continue;
        }

        if (mode === 'messages') {
          if (!Array.isArray(payload) || !payload[0]) continue;
          const msgChunk = payload[0] as AIMessageChunk;
          const meta = payload[1] as Record<string, unknown> | undefined;
          const delta = textFromMessageChunk(msgChunk);
          if (delta) {
            yield {
              kind: 'message',
              deltaText: delta,
              payload: { langgraph: meta },
            };
          }
          const rs = reasoningFromChunk(msgChunk);
          if (rs) {
            yield {
              kind: 'reasoning',
              deltaText: rs,
              payload: { langgraph: meta },
            };
          }
        } else if (mode === 'tools') {
          yield { kind: 'tool', payload };
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`streamBasicQa: ${message}`);
      yield { kind: 'error', message };
    }
  }
}
