import { z } from 'zod';
import type { UpdateSectionContentItemDto } from '@/modules/section/dto/update-content.dto';

/** 模型可能把 JSON 嵌套打成字符串；在业务层解析（工具 schema 不能用 z.preprocess，否则无法生成 JSON Schema） */
export function jsonParseIfNeeded(val: unknown): unknown {
  if (typeof val !== 'string') return val;
  const s = val.trim();
  if (!s) return val;
  if (
    (s.startsWith('[') && s.endsWith(']')) ||
    (s.startsWith('{') && s.endsWith('}'))
  ) {
    try {
      return JSON.parse(s) as unknown;
    } catch {
      return val;
    }
  }
  return val;
}

export function toInt(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return Math.trunc(v);
  }
  if (typeof v === 'string' && /^\s*-?\d+\s*$/.test(v)) {
    return parseInt(v.trim(), 10);
  }
  throw new Error(`invalid_integer:${String(v)}`);
}

export function normalizeIncludeTemplate(
  v: boolean | string | undefined,
): boolean {
  if (v === undefined) return false;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
}

export const loadResumeEditStateSchema = z.object({
  sectionIds: z
    .union([z.array(z.number().int()), z.string()])
    .optional()
    .describe(
      '仅加载这些 Section（数组或 JSON 数组字符串）；不传则用请求中的 selectedSectionIds；再否则加载全部',
    ),
  includeTemplateSchema: z
    .union([z.boolean(), z.string()])
    .optional()
    .describe(
      '是否附带 Content Template 结构，可为 true/false 或 "true"/"false"',
    ),
});

export function parseSectionIdsField(
  raw: z.infer<typeof loadResumeEditStateSchema>['sectionIds'],
): number[] | undefined {
  if (raw === undefined) return undefined;
  if (Array.isArray(raw)) {
    return raw.map((x) => toInt(x));
  }
  const parsed = jsonParseIfNeeded(raw);
  if (Array.isArray(parsed)) {
    return parsed.map((x) => toInt(x));
  }
  return undefined;
}

export function normalizeInfo(raw: unknown): {
  order: number;
  type: string;
  values: unknown;
} {
  const o = raw as Record<string, unknown>;
  const order = toInt(o?.order);
  const type = String(o?.type ?? '');
  let values: unknown = o?.values;
  if (typeof values === 'string') {
    values = jsonParseIfNeeded(values);
  }
  return { order, type, values };
}

export function normalizeContentItem(
  raw: unknown,
): UpdateSectionContentItemDto {
  const o = raw as Record<string, unknown>;
  const order = toInt(o?.order);
  let infosRaw: unknown = o?.infos;
  if (typeof infosRaw === 'string') {
    try {
      infosRaw = JSON.parse(infosRaw) as unknown;
    } catch {
      infosRaw = [];
    }
  }
  const infosArr = Array.isArray(infosRaw) ? infosRaw : [];
  return {
    order,
    infos: infosArr.map((row) => normalizeInfo(row)),
  };
}

const contentInfoSchema = z.object({
  order: z.union([z.number().int(), z.string()]),
  type: z.string(),
  values: z.union([
    z.string(),
    z.array(z.union([z.string(), z.number(), z.boolean()])),
  ]),
});

export const contentItemSchema = z.object({
  order: z.union([z.number().int(), z.string()]),
  infos: z.union([z.string(), z.array(contentInfoSchema)]),
});

export const applySectionContentSchema = z.object({
  sectionId: z.union([z.number().int(), z.string()]),
  contents: z.union([
    z
      .string()
      .min(2)
      .describe('整条 contents 的 JSON 数组字符串（模型常这样传）'),
    z
      .array(contentItemSchema)
      .min(1)
      .describe('与 PATCH section 的 contents 一致'),
  ]),
});

export function normalizeApplyContents(
  raw: string | z.infer<typeof contentItemSchema>[],
): UpdateSectionContentItemDto[] {
  let arr: unknown[];
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw) as unknown[];
    } catch {
      throw new Error('contents_invalid_json');
    }
  } else {
    arr = raw as unknown[];
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error('contents_must_be_non_empty_array');
  }
  return arr.map((row) => normalizeContentItem(row));
}

export const createSectionSchema = z.object({
  contentTemplateId: z.union([z.number().int(), z.string()]),
  order: z.union([z.number().int(), z.string()]).optional(),
});

export const searchWebContextSchema = z.object({
  query: z.string().min(1).describe('检索查询，建议含岗位/行业/技能等关键词'),
});

export async function tavilySearch(
  query: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: 'basic',
      max_results: 5,
    }),
  });
  if (!res.ok) {
    return JSON.stringify({
      ok: false,
      status: res.status,
      error: await res.text(),
    });
  }
  const data = (await res.json()) as {
    results?: { title?: string; url?: string; content?: string }[];
  };
  const lines =
    data.results?.map(
      (r, i) =>
        `${i + 1}. ${r.title ?? ''} ${r.url ?? ''}\n${(r.content ?? '').slice(0, 400)}`,
    ) ?? [];
  return lines.join('\n\n') || JSON.stringify({ ok: true, empty: true });
}
