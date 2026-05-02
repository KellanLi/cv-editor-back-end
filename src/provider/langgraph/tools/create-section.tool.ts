import { DynamicStructuredTool } from '@langchain/core/tools';
import { HttpException } from '@nestjs/common';
import { z } from 'zod';
import { SectionService } from '@/modules/section/section.service';
import { jwtPayloadForAgent } from './agent-jwt.util';

/**
 * 在当前对话关联的简历下新增一个 Section（与 HTTP section/create 一致）。
 * 入参 JSON：{ "resumeId", "contentTemplateId", "order" }；resumeId 必须与当前对话简历一致。
 */
export function createCreateSectionTool(
  sectionService: SectionService,
  ctx: { resumeId: number; userId: number },
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'create_section',
    description:
      '在**当前简历**下**新建一个**模块（Section）。请先 list_content_templates 选择 contentTemplateId，并可用 load_resume_context scope=outline 查看现有 order 再指定顺序。' +
      '入参是结构化字段（非 JSON 字符串）：resumeId、contentTemplateId、order。resumeId 必须与当前对话绑定简历一致。' +
      '创建后如需填写内容，请先调用 load_content_template 获取 values 的 JSON schema，再调用 update_section_content。',
    schema: z.object({
      resumeId: z.number().int().positive(),
      contentTemplateId: z.number().int().positive(),
      order: z.number().int().nonnegative(),
    }),
    func: async (input) => {
      const { resumeId, contentTemplateId, order } = input;

      if (resumeId !== ctx.resumeId) {
        return `create_section：resumeId 必须为当前对话关联简历 ${ctx.resumeId}，收到 ${resumeId}。`;
      }

      const jwt = jwtPayloadForAgent(ctx.userId);
      try {
        const section = await sectionService.create(
          { resumeId, contentTemplateId, order },
          jwt,
        );
        return [
          'create_section：已创建模块。',
          `sectionId=${section.id} order=${section.order} contentTemplateId=${section.contentTemplateId}`,
          '可按需调用 load_resume_context 与 update_section_content 填写内容。',
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
