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

- 简历由多个 **Section** 组成；每类经历/区块对应一种 **Section Template**（固定字段结构）。
- **Section Template** 由若干 **Info Layer** 拼接而成；用户为每层字段配置显示名称（如「职位名称」「实习 base」）。
- 系统提供三种 **Info Layer**：左标题右时间段、左右文字、富文本。
