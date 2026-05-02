import { DynamicTool } from '@langchain/core/tools';
import { HttpException } from '@nestjs/common';
import { ContentTemplateService } from '@/modules/content-template/content-template.service';
import { formatContentTemplateListItem } from './format-content-template-llm';
import { jwtPayloadForAgent } from './agent-jwt.util';

/**
 * 列出当前用户的 Content Template（与 HTTP content-template/list 一致）。
 * 入参 JSON：{ "filter"?: { "name"?: string }, "pagination"?: { "page"?: number, "pageSize"?: number } }
 */
export function createListContentTemplatesTool(
  contentTemplateService: ContentTemplateService,
  ctx: { userId: number },
): DynamicTool {
  return new DynamicTool({
    name: 'list_content_templates',
    description:
      '列出当前账号下的**内容模板**（Content Template），含各信息层 type 与 names，用于新建 Section 时选择 contentTemplateId。' +
      '入参为 JSON 字符串：filter.name 可选（模糊匹配，空字符串表示不限）；pagination.page / pageSize 可选，默认 page=1、pageSize=50。',
    func: async (raw: string) => {
      let filterName = '';
      let page = 1;
      let pageSize = 50;
      try {
        if (raw && String(raw).trim() !== '') {
          const j = JSON.parse(String(raw)) as {
            filter?: { name?: string };
            pagination?: { page?: number; pageSize?: number };
          };
          if (typeof j.filter?.name === 'string') {
            filterName = j.filter.name;
          }
          if (typeof j.pagination?.page === 'number' && !Number.isNaN(j.pagination.page)) {
            page = Math.max(1, Math.floor(j.pagination.page));
          }
          if (
            typeof j.pagination?.pageSize === 'number' &&
            !Number.isNaN(j.pagination.pageSize)
          ) {
            pageSize = Math.min(100, Math.max(1, Math.floor(j.pagination.pageSize)));
          }
        }
      } catch {
        return 'list_content_templates：参数需为 JSON，例如 {} 或 {"filter":{"name":"实习"},"pagination":{"page":1,"pageSize":20}}。';
      }

      const jwt = jwtPayloadForAgent(ctx.userId);
      try {
        const { list, pagination } = await contentTemplateService.list(
          {
            filter: { name: filterName },
            pagination: { page, pageSize, total: 0 },
          },
          jwt,
        );
        if (list.length === 0) {
          return `（无结果）共 0 条模板。filter.name=${JSON.stringify(filterName)} page=${pagination.page}。`;
        }
        const body = list.map((t) => formatContentTemplateListItem(t)).join('\n');
        return [
          `共 ${pagination.total} 条模板，当前页 ${list.length} 条（page=${pagination.page} pageSize=${pagination.pageSize}）：`,
          body,
        ].join('\n');
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
