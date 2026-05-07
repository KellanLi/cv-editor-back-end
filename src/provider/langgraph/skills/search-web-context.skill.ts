import type { SkillDefinition } from './skill-runtime';
import { searchWebContextSchema, tavilySearch } from './tool-helpers';

export const searchWebContextSkill: SkillDefinition = {
  id: 'search_web_context',
  lane: 'web',
  description:
    '联网检索与岗位/行业/技能相关的补充信息（Tavily）。仅在用户开启联网且服务端配置 key 时有效。',
  schema: searchWebContextSchema,
  async execute(ctx, raw) {
    const input = searchWebContextSchema.parse(raw);
    if (!ctx.tavilyApiKey?.trim()) {
      return JSON.stringify({
        ok: false,
        hint: '服务端未配置 TAVILY_API_KEY，无法联网检索。',
      });
    }
    const text = await tavilySearch(input.query, ctx.tavilyApiKey);
    return JSON.stringify({ ok: true, summary: text });
  },
};
