import { ConfigService } from '@nestjs/config';

export type OpenAiCompatConfig = {
  apiKey: string | undefined;
  baseURL: string;
  model: string;
};

/**
 * 百炼 / OpenAI 兼容网关（.env: OPENAI_BASE_URL、OPENAI_API_KEY、OPENAI_MODEL）
 */
export function getOpenAiCompatConfig(
  config: ConfigService,
): OpenAiCompatConfig {
  return {
    apiKey: config.get<string>('OPENAI_API_KEY') ?? process.env.OPENAI_API_KEY,
    baseURL:
      config.get<string>('OPENAI_BASE_URL') ??
      process.env.OPENAI_BASE_URL ??
      'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model:
      config.get<string>('OPENAI_MODEL') ??
      process.env.OPENAI_MODEL ??
      'qwen-plus',
  };
}

/** 联网工具 `web_search`：Tavily（https://api.tavily.com/search） */
export function getTavilySearchApiKey(
  config: ConfigService,
): string | undefined {
  return config.get<string>('TAVILY_API_KEY') ?? process.env.TAVILY_API_KEY;
}

export type LongContextConfig = {
  /** 每轮进模型的「未覆盖消息」+ 系统附加的大致总字符预算（与 `docs/long-context.md` 一致） */
  budgetChars: number;
  /** 超预算时始终保留的最近 N 条消息（`seq` 为单位的 `AiMessage` 条数） */
  reserveMessageCount: number;
};

/**
 * 长对话异步压缩 + 每轮从 DB 装配；可用环境变量或 Config 覆写（未配置时取文档默认）。
 * `AI_LONG_CONTEXT_BUDGET_CHARS`（默认 32000）、`AI_LONG_CONTEXT_RESERVE_MESSAGES`（默认 16）
 */
export function getLongContextConfig(config: ConfigService): LongContextConfig {
  const b =
    config.get<string>('AI_LONG_CONTEXT_BUDGET_CHARS') ??
    process.env.AI_LONG_CONTEXT_BUDGET_CHARS;
  const r =
    config.get<string>('AI_LONG_CONTEXT_RESERVE_MESSAGES') ??
    process.env.AI_LONG_CONTEXT_RESERVE_MESSAGES;
  const budgetChars = Math.max(
    4_000,
    parseInt(b != null && b !== '' ? b : '32000', 10) || 32000,
  );
  const reserveMessageCount = Math.max(
    2,
    parseInt(r != null && r !== '' ? r : '16', 10) || 16,
  );
  return { budgetChars, reserveMessageCount };
}
