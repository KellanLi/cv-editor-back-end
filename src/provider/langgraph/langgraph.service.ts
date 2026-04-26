import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/provider/prisma/prisma.service';
import { ChatOpenAI } from '@langchain/openai';
import {
  AIMessageChunk,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  isAIMessageChunk,
} from '@langchain/core/messages';

// package exports 子路径在 TS `moduleResolution: node` 下无法静态解析；运行时由 Node 解析。
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createReactAgent } = require('@langchain/langgraph/prebuilt') as {
  createReactAgent: (...args: unknown[]) => unknown;
};
import { MemorySaver } from '@langchain/langgraph';
import {
  getOpenAiCompatConfig,
  getTavilySearchApiKey,
} from './langgraph.config';
import { buildAgentTools } from './tools/build-agent-tools';
import type { LanggraphStreamInput } from './types/langgraph.types';

/** 归一化后供 SSE 映射的事件（与 AiChatStreamEventDto 对齐） */
export type LanggraphStreamEmit =
  | { kind: 'message'; deltaText: string; payload?: unknown }
  | { kind: 'reasoning'; deltaText: string; payload?: unknown }
  | { kind: 'tool'; payload: unknown }
  | { kind: 'error'; message: string };

export type { LanggraphStreamInput } from './types/langgraph.types';

@Injectable()
export class LanggraphService {
  private readonly logger = new Logger(LanggraphService.name);
  private readonly memory = new MemorySaver();
  private readonly llm: ChatOpenAI;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const { apiKey, baseURL, model } = getOpenAiCompatConfig(this.config);
    this.llm = new ChatOpenAI({
      model,
      temperature: 0.2,
      apiKey,
      configuration: { baseURL },
    });
  }

  /**
   * LangGraph createReactAgent + 多路 stream：
   * - messages：token / 部分模型 reasoning 片段
   * - tools：on_tool_start / on_tool_end / on_tool_error
   * 简历全文通过 **load_resume_context** 工具按需拉取
   */
  async *streamBasicQa(
    input: LanggraphStreamInput,
  ): AsyncGenerator<LanggraphStreamEmit, void, unknown> {
    const { apiKey } = getOpenAiCompatConfig(this.config);
    if (!apiKey) {
      yield {
        kind: 'error',
        message: '未配置 OPENAI_API_KEY，无法调用模型',
      };
      return;
    }

    const tavilyApiKey = getTavilySearchApiKey(this.config);
    const tools = buildAgentTools({
      prisma: this.prisma,
      resumeId: input.resumeId,
      userId: input.userId,
      suggestedSectionIds: input.suggestedSectionIds,
      enableWebSearch: input.enableWebSearch,
      tavilyApiKey,
    });
    this.logger.debug(
      `streamBasicQa: thread=${input.threadId} enableWebSearch=${String(input.enableWebSearch)} tavilyConfigured=${String(!!tavilyApiKey)} toolNames=${tools.map((t) => t.name).join(',')}`,
    );

    const agent = createReactAgent({
      llm: this.llm,
      tools,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      prompt: (state) => [
        new SystemMessage(input.systemPrompt),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ...state.messages,
      ],
      checkpointer: this.memory,
    }) as {
      stream: (
        input: { messages: HumanMessage[] },
        options: {
          configurable?: { thread_id?: string };
          streamMode?: string | string[];
        },
      ) => Promise<AsyncIterable<unknown>>;
    };

    const stream = await agent.stream(
      { messages: [new HumanMessage(input.userText)] },
      {
        configurable: { thread_id: input.threadId },
        streamMode: ['messages', 'tools'],
      },
    );

    for await (const raw of stream) {
      if (!Array.isArray(raw) || raw.length !== 2) {
        this.logger.debug(`stream chunk (ignored): ${JSON.stringify(raw)}`);
        continue;
      }
      const [mode, data] = raw as [string, unknown];

      if (mode === 'tools') {
        yield { kind: 'tool', payload: data };
        continue;
      }

      if (mode === 'messages') {
        const tuple = data as [BaseMessage, Record<string, unknown>];
        const [msg, meta] = tuple;
        if (!isAIMessageChunk(msg as AIMessageChunk)) {
          continue;
        }
        const { textDelta, reasoningDelta } = this.splitMessageChunk(
          msg as AIMessageChunk,
        );
        if (reasoningDelta) {
          yield {
            kind: 'reasoning',
            deltaText: reasoningDelta,
            payload: { langgraph: 'messages', node: meta?.langgraph_node },
          };
        }
        if (textDelta) {
          yield {
            kind: 'message',
            deltaText: textDelta,
            payload: { langgraph: 'messages', node: meta?.langgraph_node },
          };
        }
      }
    }
  }

  /**
   * 由用户首条消息生成短标题，供新会话在首条请求内写库与 SSE meta 使用；无 key 或失败时返回 null。
   */
  async generateConversationTitle(
    firstUserText: string,
  ): Promise<string | null> {
    const { apiKey, baseURL, model } = getOpenAiCompatConfig(this.config);
    if (!apiKey) {
      this.logger.debug('generateConversationTitle: no OPENAI_API_KEY');
      return null;
    }

    const normalized = firstUserText.trim().replace(/\s+/g, ' ');
    if (!normalized) {
      return null;
    }
    const snippet =
      normalized.length > 1500 ? `${normalized.slice(0, 1500)}…` : normalized;

    const titleLlm = new ChatOpenAI({
      model,
      temperature: 0.2,
      maxTokens: 100,
      apiKey,
      configuration: { baseURL },
    });

    try {
      const res = await titleLlm.invoke([
        new SystemMessage(
          '你是「简历助手」的会话标题生成器。请根据用户的第一条消息，用不超过 24 个字符的中文写一句「对话标题」：要概括用户意图、便于在列表中辨认。不要引号、不要换行、不要任何前缀/解释/结尾标点，只输出标题正文本身。',
        ),
        new HumanMessage(`用户首条消息如下：\n${snippet}`),
      ]);
      const raw = this.readPlainTextFromAiMessage(res);
      if (!raw) {
        return null;
      }
      const first = raw.split(/[\n\r]+/u)[0];
      if (!first) {
        return null;
      }
      const line = first.replace(/^["'「『\s]+|["'」』\s]+$/gu, '').trim();
      if (!line) {
        return null;
      }
      return line.length > 60 ? `${line.slice(0, 57)}…` : line;
    } catch (e) {
      this.logger.warn(
        `generateConversationTitle: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }

  private readPlainTextFromAiMessage(msg: { content: unknown }): string {
    const c = msg.content;
    if (typeof c === 'string') {
      return c;
    }
    if (Array.isArray(c)) {
      let s = '';
      for (const part of c) {
        if (!part || typeof part !== 'object') {
          continue;
        }
        const p = part as { type?: string; text?: string };
        if (p.type === 'text' && typeof p.text === 'string') {
          s += p.text;
        }
      }
      return s;
    }
    return '';
  }

  private splitMessageChunk(chunk: AIMessageChunk): {
    textDelta?: string;
    reasoningDelta?: string;
  } {
    const reasoningFromKwargs = this.readReasoningFromKwargs(
      chunk.additional_kwargs,
    );
    let textFromContent = '';
    let reasoningFromContent = '';

    const c = chunk.content;
    if (typeof c === 'string' && c.length > 0) {
      textFromContent = c;
    } else if (Array.isArray(c)) {
      for (const part of c) {
        if (!part || typeof part !== 'object') continue;
        const p = part as Record<string, unknown>;
        const t = p.type;
        if (t === 'text' && typeof p.text === 'string') {
          textFromContent += p.text;
        }
        if (t === 'reasoning' && typeof p.text === 'string') {
          reasoningFromContent += p.text;
        }
      }
    }

    const reasoningDelta =
      reasoningFromKwargs || reasoningFromContent || undefined;
    const textDelta = textFromContent || undefined;

    return { textDelta, reasoningDelta };
  }

  private readReasoningFromKwargs(
    kwargs: AIMessageChunk['additional_kwargs'],
  ): string | undefined {
    if (!kwargs || typeof kwargs !== 'object') return undefined;
    const k = kwargs as Record<string, unknown>;
    const candidates = [
      k.reasoning_content,
      k.reasoning,
      k.thinking,
      k.thought,
    ];
    for (const v of candidates) {
      if (typeof v === 'string' && v.length > 0) return v;
    }
    return undefined;
  }
}
