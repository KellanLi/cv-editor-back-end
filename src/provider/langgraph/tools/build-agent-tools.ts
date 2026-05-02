import type { ClientTool } from '@langchain/core/tools';
import { PrismaService } from '@/provider/prisma/prisma.service';
import { SectionService } from '@/modules/section/section.service';
import { ContentTemplateService } from '@/modules/content-template/content-template.service';
import { AiConversationPurpose } from '@/generated/enums';
import { createGetResumeContextTool } from './get-resume-context.tool';
import { createWebSearchTool } from './web-search.tool';
import { createGetConversationContextTool } from './get-conversation-context.tool';
import { createListContentTemplatesTool } from './list-content-templates.tool';
import { createLoadContentTemplateTool } from './load-content-template.tool';
import { createCreateSectionTool } from './create-section.tool';
import { createUpdateSectionContentTool } from './update-section-content.tool';

export function buildAgentTools(opts: {
  prisma: PrismaService;
  sectionService: SectionService;
  contentTemplateService: ContentTemplateService;
  resumeId: number;
  userId: number;
  conversationId: number;
  purpose: AiConversationPurpose;
  suggestedSectionIds?: number[];
  /** 是否除简历工具外再挂上联网工具 */
  enableWebSearch: boolean;
  /** Tavily Search API Key；未设时 `web_search` 会返回需配置环境变量的说明 */
  tavilyApiKey?: string;
  /**
   * 可注入单例 web_search（便于测试/替换）；未传时内部 new
   */
  webSearch?: ClientTool;
}): ClientTool[] {
  const resumeTool = createGetResumeContextTool(opts.prisma, {
    resumeId: opts.resumeId,
    userId: opts.userId,
    suggestedSectionIds: opts.suggestedSectionIds,
  });
  const historyTool = createGetConversationContextTool(opts.prisma, {
    conversationId: opts.conversationId,
    userId: opts.userId,
  });
  const listTemplatesTool = createListContentTemplatesTool(
    opts.contentTemplateService,
    { userId: opts.userId },
  );
  const loadTemplateTool = createLoadContentTemplateTool(
    opts.contentTemplateService,
    { userId: opts.userId },
  );
  const base: ClientTool[] = [
    resumeTool,
    historyTool,
    listTemplatesTool,
    loadTemplateTool,
  ];
  if (opts.purpose === AiConversationPurpose.DIALOGUE_EDIT) {
    base.push(
      createCreateSectionTool(opts.sectionService, {
        resumeId: opts.resumeId,
        userId: opts.userId,
      }),
      createUpdateSectionContentTool(opts.prisma, opts.sectionService, {
        resumeId: opts.resumeId,
        userId: opts.userId,
      }),
    );
  }
  const web =
    opts.webSearch ?? createWebSearchTool({ tavilyApiKey: opts.tavilyApiKey });
  return opts.enableWebSearch ? [...base, web] : base;
}
