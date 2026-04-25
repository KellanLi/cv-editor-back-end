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
