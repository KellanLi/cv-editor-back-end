---
name: task-log
description: >-
  Appends dated task logs under docs/task-log with prompt and change summary.
  Use when editing docs/task-log, recording confirmed changes after a session,
  or when the user asks to log work or write a task summary.
---

# Task log（确认后变更记录）

## 位置与命名

- 目录：`docs/task-log/`
- 文件：`[date].md`，`date` 为 `YYYY-MM-DD`（与现有约定一致）。

## 何时写入

在用户**确认**本次修改后，将对应条目追加到**当天**的日志文件；若文件不存在则新建。

## 条目结构

每条记录包含：时间、原始 Cursor 提示摘要（可截断过长内容）、修改要点列表。

### 模板

```markdown
# [date] Task Log

## [time]

### Cursor Prompt

（原始 prompt 或精简复述）

### 修改内容总结

- …
```

## 注意

- **修改内容总结**用可扫描的短句，便于日后检索。
- 同一日多次确认可对应多个 `## [time]` 小节。
