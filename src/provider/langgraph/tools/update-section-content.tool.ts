import { DynamicStructuredTool } from '@langchain/core/tools';
import { HttpException } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '@/provider/prisma/prisma.service';
import { SectionService } from '@/modules/section/section.service';
import type { UpdateSectionContentDto } from '@/modules/section/dto/update-content.dto';
import { jwtPayloadForAgent } from './agent-jwt.util';

function normalizeInfoType(type: string): string {
  return type.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function stringifyIfObject(value: unknown): unknown {
  if (isPlainObject(value)) {
    return JSON.stringify(value);
  }
  return value;
}

function isDateLikeString(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(v);
}

function normalizeAndValidateInfoValues(
  infoType: string,
  values: unknown,
): { ok: true; values: unknown } | { ok: false; message: string } {
  const t = normalizeInfoType(infoType);

  if (t.includes('TITLE') && t.includes('TIME')) {
    if (!Array.isArray(values) || values.length !== 2) {
      return {
        ok: false,
        message:
          'TITLE_AND_TIME_PERIOD 的 values 必须是长度为 2 的数组：[title, periodJsonString]。',
      };
    }
    const title = String(values[0] ?? '');
    const periodRaw = stringifyIfObject(values[1]);
    if (typeof periodRaw !== 'string') {
      return {
        ok: false,
        message: 'TITLE_AND_TIME_PERIOD 的 values[1] 必须是 JSON 字符串或对象。',
      };
    }
    try {
      const period = JSON.parse(periodRaw) as unknown;
      if (!isPlainObject(period)) {
        return { ok: false, message: 'values[1] 解析后必须是对象。' };
      }
      if (!isDateLikeString(period.start) || !isDateLikeString(period.end)) {
        return {
          ok: false,
          message: 'values[1] 中 start/end 必须是 YYYY-MM-DD 字符串。',
        };
      }
      return {
        ok: true,
        values: [title, JSON.stringify({ start: period.start, end: period.end })],
      };
    } catch {
      return {
        ok: false,
        message:
          'TITLE_AND_TIME_PERIOD 的 values[1] 必须是可解析 JSON（例如 {"start":"2026-04-01","end":"2026-04-18"}）。',
      };
    }
  }

  if (t.includes('LEFT') && t.includes('RIGHT')) {
    if (!Array.isArray(values) || values.length !== 2) {
      return {
        ok: false,
        message: 'LEFT_AND_RIGHT_TEXT 的 values 必须是长度为 2 的字符串数组。',
      };
    }
    return { ok: true, values: [String(values[0] ?? ''), String(values[1] ?? '')] };
  }

  if (t.includes('RICH')) {
    if (typeof values === 'string') {
      return { ok: true, values: [values] };
    }
    if (!Array.isArray(values) || values.length < 1) {
      return {
        ok: false,
        message: 'RICH_TEXT 的 values 必须是字符串或至少 1 项的字符串数组。',
      };
    }
    return { ok: true, values: [String(values[0] ?? '')] };
  }

  return { ok: true, values };
}

function validateAgainstTemplate(params: {
  contents: UpdateSectionContentDto['contents'];
  templateOrders: number[];
}): string | null {
  const expected = [...params.templateOrders].sort((a, b) => a - b);
  for (const content of params.contents) {
    const actual = [...content.infos].map((x) => x.order).sort((a, b) => a - b);
    if (actual.length !== expected.length) {
      return `content.order=${content.order} 的 infos 数量不完整：期望 ${expected.length} 项（order=${expected.join(',')}），收到 ${actual.length} 项（order=${actual.join(',')}）。`;
    }
    for (let i = 0; i < expected.length; i += 1) {
      if (actual[i] !== expected[i]) {
        return `content.order=${content.order} 的 infos.order 不完整：期望 order=${expected.join(',')}，收到 order=${actual.join(',')}。`;
      }
    }
  }
  return null;
}

/**
 * 替换**一个** Section 下的全部 Content/Info（与 HTTP section/update-content 一致）。
 */
export function createUpdateSectionContentTool(
  prisma: PrismaService,
  sectionService: SectionService,
  ctx: { resumeId: number; userId: number },
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'update_section_content',
    description:
      '**一次仅更新一个 Section**：用 contents 全量替换该 sectionId 下所有 Content 与 Info（漏写会导致条目被删）。' +
      '请先 load_resume_context（含该 section）与 load_content_template（该 Section 的 contentTemplateId）再改 values。' +
      '入参为结构化字段（非 JSON 字符串），直接传 sectionId 与 contents。' +
      '对于 TITLE_AND_TIME_PERIOD，可将 values[1] 直接传对象 {start,end} 或 JSON 字符串，工具会自动规范化。',
    schema: z.object({
      sectionId: z.number().int().positive(),
      contents: z.array(
        z.object({
          order: z.number().int().nonnegative(),
          infos: z.array(
            z.object({
              order: z.number().int().nonnegative(),
              type: z.string().min(1),
              values: z.unknown(),
            }),
          ),
        }),
      ),
    }),
    func: async (input) => {
      const parsed: UpdateSectionContentDto = {
        sectionId: input.sectionId,
        contents: input.contents.map((item) => ({
          order: item.order,
          infos: item.infos.map((info) => ({
            order: info.order,
            type: info.type,
            values: info.values,
          })),
        })),
      };

      const owned = await prisma.section.findFirst({
        where: {
          id: parsed.sectionId,
          resumeId: ctx.resumeId,
          resume: { userId: ctx.userId },
        },
        select: { id: true, contentTemplateId: true },
      });
      if (!owned) {
        return `update_section_content：模块 ${parsed.sectionId} 不存在、不属于当前简历 ${ctx.resumeId}，或无权访问。`;
      }

      const template = await prisma.contentTemplate.findFirst({
        where: { id: owned.contentTemplateId, userId: ctx.userId },
        select: {
          id: true,
          infoTemplates: {
            select: { order: true, type: true },
            orderBy: { order: 'asc' },
          },
        },
      });
      if (!template) {
        return `update_section_content：未找到 sectionId=${parsed.sectionId} 对应模板（contentTemplateId=${owned.contentTemplateId}）。`;
      }

      const typeByOrder = new Map(
        template.infoTemplates.map((x) => [x.order, x.type] as const),
      );
      const templateOrderError = validateAgainstTemplate({
        contents: parsed.contents,
        templateOrders: template.infoTemplates.map((x) => x.order),
      });
      if (templateOrderError) {
        return `update_section_content：${templateOrderError}（该接口是全量替换，每个 content 都必须提供模板要求的全部 info.order）。`;
      }

      for (const item of parsed.contents) {
        for (const info of item.infos) {
          const expectedType = typeByOrder.get(info.order);
          if (!expectedType) {
            return `update_section_content：content.order=${item.order} 中 info.order=${info.order} 不存在于模板。`;
          }
          if (normalizeInfoType(expectedType) !== normalizeInfoType(info.type)) {
            return `update_section_content：content.order=${item.order} info.order=${info.order} 的 type 不匹配，期望 ${expectedType}，收到 ${info.type}。`;
          }
          const normalized = normalizeAndValidateInfoValues(info.type, info.values);
          if (!normalized.ok) {
            return `update_section_content：content.order=${item.order} info.order=${info.order} 校验失败：${normalized.message}`;
          }
          info.values = normalized.values;
        }
      }

      const jwt = jwtPayloadForAgent(ctx.userId);
      try {
        await sectionService.updateContent(parsed, jwt);
        return `update_section_content：已更新 sectionId=${parsed.sectionId}（全量替换 contents）。可再次 load_resume_context 核对。`;
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
