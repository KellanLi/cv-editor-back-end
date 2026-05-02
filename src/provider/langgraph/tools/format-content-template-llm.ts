/** 将 InfoTemplate.names（Json）规范为可读标签列表 */
export function formatInfoTemplateNames(names: unknown): string[] {
  if (!Array.isArray(names)) {
    return [];
  }
  return names.map((x) => (typeof x === 'string' ? x : JSON.stringify(x)));
}

export function typeHintForInfoLayer(type: string): string {
  const t = type.toUpperCase();
  if (t.includes('RICH')) {
    return '富文本：values 通常仅一项，为 HTML 等。';
  }
  if (t.includes('TIME') || t.includes('PERIOD')) {
    return '常含时间段字段：对应槽位多为 JSON 字符串，如 {"start":"2026-01-01","end":"2026-06-30"}。';
  }
  if (t.includes('LEFT') || t.includes('RIGHT')) {
    return '左右文本：与 names 列下标一一对应。';
  }
  return '按模板中 names 与 values 下标一一对应；写入 Info 时 type 须与模板一致。';
}

type InfoTpl = { order: number; type: string; names: unknown };

function normalizeInfoType(type: string): string {
  return type.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function getValueSchemaHintByType(type: string): string {
  const normalized = normalizeInfoType(type);
  if (normalized.includes('TITLE') && normalized.includes('TIME')) {
    return [
      'values 需为长度 2 的字符串数组：',
      '  values[0]：标题文本（string）',
      '  values[1]：JSON 字符串，结构为 {"start":"YYYY-MM-DD","end":"YYYY-MM-DD"}',
      '  示例：["示例标题","{\\"start\\":\\"2026-04-01\\",\\"end\\":\\"2026-04-18\\"}"]',
    ].join('\n');
  }
  if (normalized.includes('LEFT') && normalized.includes('RIGHT')) {
    return [
      'values 需为长度 2 的字符串数组：',
      '  values[0]：左侧文本（string）',
      '  values[1]：右侧文本（string）',
      '  示例：["示例左文本","示例右文本"]',
    ].join('\n');
  }
  if (normalized.includes('RICH')) {
    return [
      'values 通常为长度 1 的字符串数组：',
      '  values[0]：HTML 富文本（string）',
      '  示例：["<p>示例富文本</p>"]',
    ].join('\n');
  }
  return [
    'values 按 names 下标对齐，元素建议为字符串。',
    '若需嵌套对象，请使用 JSON 字符串（而非直接对象），并确保转义合法。',
  ].join('\n');
}

export function buildInfoValuesSchemaSkill(infoTemplates: InfoTpl[]): string {
  const lines: string[] = [
    '【Section 编辑 Skill：Info.values JSON 写法】',
    '1) 先按 info.order 与模板对齐，再填写同 order 的 values。',
    '2) update_section_content 使用结构化参数（不是 JSON 字符串）；优先直接传对象/数组，不要自行拼接转义字符串。',
    '3) 时间段层可直接传 values[1]={start,end}；工具会自动规范化为字符串。',
    '4) 严禁漏写 infos/contents 条目；update_section_content 为全量替换。',
    '5) 常见信息层格式如下：',
    '  - TITLE_AND_TIME_PERIOD: ["标题","{\\"start\\":\\"2026-04-01\\",\\"end\\":\\"2026-04-18\\"}"]',
    '  - LEFT_AND_RIGHT_TEXT: ["左文本","右文本"]',
    '  - RICH_TEXT: ["<p>富文本</p>"]',
  ];
  const sorted = [...infoTemplates].sort((a, b) => a.order - b.order);
  for (const it of sorted) {
    lines.push(
      `6.${it.order + 1}) 当前模板 order=${it.order} type=${it.type} 的 values 规则：`,
      getValueSchemaHintByType(it.type),
    );
  }
  return lines.join('\n');
}

export function formatContentTemplateDetail(
  template: { id: number; name: string; infoTemplates: InfoTpl[] },
): string {
  const layers = [...template.infoTemplates].sort((a, b) => a.order - b.order);
  const lines: string[] = [
    `【内容模板】id=${template.id} name=${template.name}`,
    '说明：编辑 Section 时，每条 Content 下的 infos 须按此处 order/type/names 组织；values 长度与 names 一致。',
  ];
  for (const it of layers) {
    const labels = formatInfoTemplateNames(it.names);
    const slots = labels
      .map((lab, i) => `values[${i}]←「${lab}」`)
      .join('；');
    lines.push(
      `  · order=${it.order} type=${it.type}  ${typeHintForInfoLayer(it.type)}`,
      `    槽位：${slots || '（无 names，按业务约定填 values）'}`,
    );
  }
  lines.push('', buildInfoValuesSchemaSkill(layers));
  return lines.join('\n');
}

export function formatContentTemplateListItem(template: {
  id: number;
  name: string;
  infoTemplates: InfoTpl[];
}): string {
  const layers = [...template.infoTemplates].sort((a, b) => a.order - b.order);
  const brief = layers
    .map(
      (it) =>
        `[o${it.order} ${it.type}: ${formatInfoTemplateNames(it.names).join('/')}]`,
    )
    .join(' ');
  return `id=${template.id} name=${template.name}  ${brief}`;
}
