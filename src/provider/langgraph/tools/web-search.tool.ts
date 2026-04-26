import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';
const MAX_QUERY_LEN = 400;

type TavilyResultItem = {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
};

type TavilySearchJson = {
  query?: string;
  answer?: string;
  results?: TavilyResultItem[];
  detail?: { error?: string };
  error?: string;
};

/**
 * 使用 [Tavily Search](https://tavily.com) 的 `/search` API（为 LLM/RAG 场景设计），
 * 以 `Authorization: Bearer <TAVILY_API_KEY>` 调用。
 * 未配置 `TAVILY_API_KEY` 时返回说明文本，不伪造检索结果。
 *
 * 使用带 Zod 入参的 `tool()`，便于在 OpenAI 风格 `tools` / function calling 中生成
 * 标准的 `type: "object" + properties` 结构（部分兼容网关对 Dynamic 字符串工具有兼容性问题）。
 */
export function createWebSearchTool(
  options: {
    tavilyApiKey?: string;
  } = {},
) {
  const tavilyApiKey = options.tavilyApiKey;
  return tool(
    async ({ query }) => {
      const trimmed = String(query ?? '').trim();
      if (!trimmed) {
        return '（空查询）';
      }
      if (!tavilyApiKey) {
        return '联网未启用：服务器未配置 TAVILY_API_KEY，无法调用 Tavily Search。请联系运维在环境变量中设置 API Key。';
      }

      const q = trimmed.slice(0, MAX_QUERY_LEN);
      const body = {
        query: q,
        search_depth: 'basic' as const,
        max_results: 5,
        topic: 'general' as const,
        include_answer: true,
      };

      const res = await fetch(TAVILY_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${tavilyApiKey}`,
        },
        body: JSON.stringify(body),
      });

      const raw: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err =
          (typeof raw === 'object' &&
            raw &&
            (raw as TavilySearchJson).detail?.error) ||
          (raw as TavilySearchJson).error;
        return `Tavily 搜索失败（HTTP ${res.status}）${err ? `：${String(err)}` : '。'}`;
      }

      return formatTavilyForAgent(
        (typeof raw === 'object' && raw) as TavilySearchJson,
        q,
      );
    },
    {
      name: 'web_search',
      description:
        '联网搜索：根据自然语言问题检索互联网，返回相关网页的标题、链接与内容摘要。需要站外信息、事实核对或「最新/网页」类问题时必须调用此工具，不要编造网页内容。',
      schema: z.object({
        query: z
          .string()
          .describe('搜索查询，使用完整、具体的自然语言关键词或问句。'),
      }),
    },
  );
}

function formatTavilyForAgent(data: TavilySearchJson, query: string): string {
  const parts: string[] = [];
  if (data.answer) {
    parts.push('【简要综合】\n' + data.answer);
  }
  const results = data.results ?? [];
  if (results.length > 0) {
    const lines: string[] = [
      '【相关网页摘要】（供核对来源；优先依据摘要与原文链接）',
    ];
    for (const [i, r] of results.entries()) {
      const title = (r.title ?? '（无标题）').slice(0, 200);
      const url = r.url ?? '';
      const content = (r.content ?? '').slice(0, 1500);
      const scoreN = Number(r.score);
      const score = Number.isFinite(scoreN)
        ? ` 相关度: ${scoreN.toFixed(2)}`
        : '';
      lines.push(
        `${i + 1}. ${title}\n   URL: ${url}${score}\n   摘要: ${content}`,
      );
    }
    parts.push(lines.join('\n\n'));
  }
  if (parts.length === 0) {
    return `未从 Tavily 获得有效结果。查询: ${query}`;
  }
  return parts.join('\n\n');
}
