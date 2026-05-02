import { DynamicTool } from '@langchain/core/tools';
import { HttpException } from '@nestjs/common';
import { ContentTemplateService } from '@/modules/content-template/content-template.service';
import { formatContentTemplateDetail } from './format-content-template-llm';
import { jwtPayloadForAgent } from './agent-jwt.util';

/**
 * 拉取单条 Content Template 的语义说明（与当前用户拥有的模板一致）。
 * 入参 JSON：{ "contentTemplateId": number }
 */
export function createLoadContentTemplateTool(
  contentTemplateService: ContentTemplateService,
  ctx: { userId: number },
): DynamicTool {
  return new DynamicTool({
    name: 'load_content_template',
    description:
      '读取**一条**内容模板（Content Template）的完整语义：各信息层 order、type、用户配置字段名 names 与 values 下标对应关系。' +
      '编辑某 Section 前，请结合 load_resume_context 中该 Section 的 contentTemplateId 调用本工具。' +
      '入参 JSON：{"contentTemplateId":number}。',
    func: async (raw: string) => {
      let contentTemplateId: number;
      try {
        const j = JSON.parse(String(raw)) as { contentTemplateId?: unknown };
        contentTemplateId = Number(j.contentTemplateId);
        if (!Number.isFinite(contentTemplateId) || contentTemplateId <= 0) {
          return 'load_content_template：需提供正整数 contentTemplateId。';
        }
      } catch {
        return 'load_content_template：参数需为 JSON，例如 {"contentTemplateId":1}。';
      }

      const jwt = jwtPayloadForAgent(ctx.userId);
      try {
        const template = await contentTemplateService.findByIdForUser(
          contentTemplateId,
          jwt,
        );
        return formatContentTemplateDetail(template);
      } catch (e) {
        if (e instanceof HttpException) {
          const r = e.getResponse();
          return typeof r === 'string' ? r : JSON.stringify(r);
        }
        return e instanceof Error ? e.message : String(e);
      }
    },
  });
}
