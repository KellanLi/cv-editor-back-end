import type { DynamicTool } from '@langchain/core/tools';
import { PrismaService } from '@/provider/prisma/prisma.service';
import { createGetResumeContextTool } from './get-resume-context.tool';
import { createWebSearchTool } from './web-search.tool';

export function buildAgentTools(opts: {
  prisma: PrismaService;
  resumeId: number;
  userId: number;
  suggestedSectionIds?: number[];
  /** 是否除简历工具外再挂上联网工具 */
  enableWebSearch: boolean;
  /** Tavily Search API Key；未设时 `web_search` 会返回需配置环境变量的说明 */
  tavilyApiKey?: string;
  /**
   * 可注入单例 web_search（便于测试/替换）；未传时内部 new
   */
  webSearch?: DynamicTool;
}): DynamicTool[] {
  const resumeTool = createGetResumeContextTool(opts.prisma, {
    resumeId: opts.resumeId,
    userId: opts.userId,
    suggestedSectionIds: opts.suggestedSectionIds,
  });
  const web =
    opts.webSearch ?? createWebSearchTool({ tavilyApiKey: opts.tavilyApiKey });
  return opts.enableWebSearch ? [resumeTool, web] : [resumeTool];
}
