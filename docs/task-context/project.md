# 项目信息

## 项目名称

AI辅助的简历编辑系统

## 项目技术栈

- NestJS（Express）
- pnpm
- prisma + MySQL
- langchain

## 领域名词（中英）

| 中文     | 英文 / 代码用语           |
| -------- | ------------------------- |
| 简历     | Resume                    |
| 模块     | Section                   |
| 模块内容 | Section Content / Content |
| 模块模版 | Content Template          |
| 信息层   | Info Layer                |

## 模块与信息层

- 简历由多个 **Section** 组成；每类经历/区块对应一种 **Content Template**（固定字段结构）。
- **Content Template** 由若干 **Info Layer** 拼接而成；用户为每层字段配置显示名称（如「职位名称」「实习 base」）。
- 系统提供三种 **Info Layer**：左标题右时间段、左右文字、富文本。

## 信息层枚举及数据示例

```typescript
import TitleAndTimePeriod from './title-and-time-period';
import LeftAndRightText from './left-and-right-text';
import RichText from './rich-text';

export const enum INFO_LAYER {
  TITLE_AND_TIME_PERIOD = 'TITLE_AND_TIME_PERIOD',
  LEFT_AND_RIGHT_TEXT = 'LEFT_AND_RIGHT_TEXT',
  RICH_TEXT = 'RICH_TEXT',
}

export const INFO_LAYER_MAP = {
  [INFO_LAYER.TITLE_AND_TIME_PERIOD]: {
    component: TitleAndTimePeriod,
    name: '标题 + 时间段',
    defaultProps: {
      active: false,
      labels: ['标题', '时间段'],
      values: ['示例标题', '{"start":"2026-04-01","end":"2026-04-18"}'],
      onChange: (values: string[]) => {
        console.log('onChange', values);
      },
    },
  },
  [INFO_LAYER.LEFT_AND_RIGHT_TEXT]: {
    component: LeftAndRightText,
    name: '左右文本',
    defaultProps: {
      active: false,
      labels: ['左文本', '右文本'],
      values: ['示例左文本', '示例右文本'],
      onChange: (values: string[]) => {
        console.log('onChange', values);
      },
    },
  },
  [INFO_LAYER.RICH_TEXT]: {
    component: RichText,
    name: '富文本',
    defaultProps: {
      active: false,
      labels: ['富文本'],
      values: ['<p>示例富文本</p>'],
      onChange: (values: string[]) => {
        console.log('onChange', values);
      },
    },
  },
};
```
