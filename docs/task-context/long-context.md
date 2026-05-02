# 长上下文处理设计说明

本文描述「历史对话过长」场景下的**异步压缩、滚动摘要与按需检索**方案，与现有 **NestJS、Prisma + MySQL、LangGraph、ReAct 工具** 架构对齐。实现以本文为准，如有变更应同步更新本文。

---

## 1. 背景与目标

### 1.1 问题

随着单线程（`AiConversation`）下消息增多，若每次请求将**全量** `AiMessage` 与系统提示、简历相关上下文拼入模型，会导致：

- 超模型上下文窗口或质量下降；
- 首字延迟与费用上升。

本文所称「长上下文」特指**历史对话记录**过长，不包含「简历全文」等已由既有工具（如 `load_resume_context`）按需加载的内容。

### 1.2 目标

- 在超过预算时，对**早期**历史做**压缩存储**，近期对话仍以**原文**进入模型（工作集）。
- **压缩不阻塞**当前一次用户请求的主链路，采用**异步**任务落库。
- 在滚动摘要与工具就绪后，支持让 **LLM 通过工具**按需取回更细历史（可选、后续迭代）。

---

## 2. 设计原则

| 原则          | 说明                                                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 单一主读路径  | 主模型当轮组 prompt 时，优先从 **`AiConversationContextSummary.rollingSummary`** 读取「已折叠部分」，避免与 LangGraph 内存 checkpoint 双真源；checkpoint 中的历史如有重复，以 DB 装配策略为准逐步收敛。 |
| 工作集 + 外存 | **固定**保留「最近 _K_ 条或等价 token/字符预算」的完整 `AiMessage`；更早区间由**滚动摘要**或分块表侧载。                                                                                                |
| 异步写路径    | 超预算时**入队**压缩任务，**当前**响应仍用当前快照 + 近期明文；后台完成后更新摘要与覆盖边界。                                                                                                           |
| 幂等与可重试  | 对同一 `conversationId + 区间` 的重复入队可去重；任务失败可重试并记录错误。                                                                                                                             |

---

## 3. 与现有模型的关系

- **会话主键**：`AiConversation`（`threadId` 与 LangGraph `configurable.thread_id` 一致）。
- **时序主键**：`AiMessage.seq` 在同一会话内单调递增，**压缩范围与 `coversUpToSeq` 均以 `seq` 为界**。
- **简历/全局信息**：`AiGlobalContext`、简历模块内容等不纳入本文「对话折叠」表；仍通过现有工具与 `Resume` 关联拉取。

---

## 4. 同步与异步的取舍

本设计采用**异步压缩**。

- **原因**：主链路避免额外串行一次（或多次）LLM 摘要，降低首包延迟与超时风险；压缩可限流、重试。
- **代价**：在任务完成前的若干轮内，摘要可能尚未包含「刚超过阈值的那段」的压缩结果，须用**工作集**保证近期对话仍完整可读；见第 6、7 节。

（若以后对延迟不敏感、希望实现极简单，可再评估**同步**路径；当前文档不展开。）

---

## 5. 数据模型（目标形态）

**落库实现**：`prisma/schema.prisma` 中已定义 `AiConversationContextSummary`、`AiContextChunk`、`AiContextCompactionJob` 与枚举 `AiContextCompactionJobStatus`；`AiConversation` 上已建立 `contextSummary`、`contextChunks`、`compactionJobs` 关系。迁移见 `prisma/migrations/20260426162806_add_ai_long_context_tables/`。表 DTO 见 `src/common/dto/table/ai-conversation-context-summary.dto.ts` 等。

以下字段说明与上表一致，**若与 `schema.prisma` 有出入以 schema 为准**。

### 5.1 枚举

| 枚举名                         | 值                                                       | 说明         |
| ------------------------------ | -------------------------------------------------------- | ------------ |
| `AiContextCompactionJobStatus` | `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED` | 压缩任务状态 |

（可选）后续可增加 `AiContextChunkKind` 等，首版可省略。

### 5.2 `AiConversationContextSummary`（`ai_conversation_context_summary`）

每会话**最多一行**，供每次请求**快速**读取「已折叠历史」的单一真相。

| 字段                      | 类型/约束                              | 说明                                                                                                  |
| ------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `id`                      | `Int` PK                               |                                                                                                       |
| `conversationId`          | `Int` `@unique`，FK → `AiConversation` | `onDelete: Cascade`                                                                                   |
| `rollingSummary`          | `Text`                                 | 对**已覆盖**的较早区间的压缩叙述与要点                                                                |
| `coversUpToSeq`           | `Int`                                  | 表示 `1..coversUpToSeq` 的语义已折叠进 `rollingSummary`（与 `AiMessage.seq` 对齐；为 0 表示尚无折叠） |
| `version`                 | `Int`，默认 `0`                        | 成功合并后递增，便于乐观并发与排查                                                                    |
| `createdAt` / `updatedAt` | `DateTime`                             |                                                                                                       |

### 5.3 `AiContextChunk`（`ai_context_chunk`）

一次压缩任务产出的**可追溯块**，用于审计、按区间检索、后续**语义/关键词检索**与工具回源。

| 字段                  | 类型/约束                            | 说明                                          |
| --------------------- | ------------------------------------ | --------------------------------------------- |
| `id`                  | `Int` PK                             |                                               |
| `conversationId`      | `Int` FK → `AiConversation`          | `onDelete: Cascade`                           |
| `startSeq` / `endSeq` | `Int`                                | 闭区间，对应本块摘要所依据的 `AiMessage` 范围 |
| `summary`             | `Text`                               | 该段的摘要正文                                |
| `producedByJobId`     | `Int?` FK → `AiContextCompactionJob` | 可选；`onDelete: SetNull`                     |
| `sourceHash`          | `String?`                            | 参与压缩的原文归一化后的 hash，用于幂等去重   |
| `createdAt`           | `DateTime`                           |                                               |

索引建议：`(conversationId, startSeq)`。

### 5.4 `AiContextCompactionJob`（`ai_context_compaction_job`）

**异步任务队列**。

| 字段                                    | 类型/约束                   | 说明                                                                                                      |
| --------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `id`                                    | `Int` PK                    |                                                                                                           |
| `conversationId`                        | `Int` FK → `AiConversation` |                                                                                                           |
| `fromSeq` / `toSeq`                     | `Int`                       | 本任务要折叠的闭区间（与策略一致，通常折叠「最早且尚未被 `coversUpToSeq` 覆盖且不在近期工作集内」的区间） |
| `status`                                | 枚举，默认 `PENDING`        |                                                                                                           |
| `idempotencyKey`                        | `String` `@unique`          | 如 `{conversationId}:{fromSeq}:{toSeq}[:v]`，避免重复入队                                                 |
| `attempts` / `maxAttempts`              | `Int`                       | 重试控制                                                                                                  |
| `lastError`                             | `Text?`                     | 末次失败信息                                                                                              |
| `scheduledAt`                           | `DateTime?`                 | 延迟/重试调度用                                                                                           |
| `lockedAt` / `startedAt` / `finishedAt` | 可选                        | 多 worker 抢锁与可观测性                                                                                  |
| `createdAt` / `updatedAt`               | `DateTime`                  |                                                                                                           |

索引建议：`(conversationId, status)`、`(status, scheduledAt)`（供 worker 拉取）。

`AiConversation` 上应建立与 `contextSummary`、与 `contextChunks` / `compactionJobs` 的关系，具体以 `schema.prisma` 为准。

---

## 6. 代码结构（类名与职责）

以下为建议命名，便于在 `src/modules/ai` 与 `src/provider/langgraph` 中分工实现。

| 类名                                                             | 职责                                                                                                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ContextBudgetService`                                           | 根据条数/字符/（可选）token 估计长度，是否超过阈值；输出建议压缩区间 `[fromSeq, toSeq]` 或「无需压缩」                                                                               |
| `ContextCompactionPolicyService`                                 | 结合 `coversUpToSeq` 与**未结** / 重叠的 Job，**决定是否入队、是否去重**                                                                                                             |
| `ContextCompactionQueueService`                                  | 创建 `AiContextCompactionJob` 记录，写入 `PENDING` 与 `idempotencyKey`                                                                                                               |
| `ContextCompactionProcessor` 或 `ContextCompactionWorkerService` | 拉取可执行任务 → `RUNNING` → 读 `AiMessage` → 调 LLM 生成摘要 → 写 `AiContextChunk` → 事务内**合并** `rollingSummary` 与 `coversUpToSeq` → 标记 `SUCCEEDED`；失败可重入队或 `FAILED` |
| `ConversationContextLoaderService`                               | **每次对话请求**：读取 `rollingSummary` + 自 `coversUpToSeq+1` 起直至最新的消息，再按**工作集**截断/装配为 LangGraph / OpenAI 消息列表；**不等待**未完成任务                         |
| `SearchConversationContextTool`（LangChain Tool，可选/二期）     | 按 `seq` 范围或短 query 从摘要块与必要时原始 `AiMessage` 拉取，供 Agent 自主取历史                                                                                                   |

**调度**：`Bull`/`BullMQ`、`@nestjs/schedule` 轮询或等价机制由基础设施选型决定，Processor 内只依赖上述业务服务，便于单测与替换。

---

## 7. 运行时流程

### 7.1 单次用户发消息（主链路）

1. 解析出 `conversationId`（与 `threadId` 可互查）。
2. `ConversationContextLoaderService` 读 `AiConversationContextSummary`（无则视为空摘要、`coversUpToSeq = 0`）。
3. 自 `coversUpToSeq + 1` 起按 `seq` 升序拉取 `AiMessage`，与系统提示、工具说明等一起交给 `ContextBudgetService` 判定。
4. **未超长**：不创建 Job，将装配结果交给 LangGraph 流式处理。
5. **超长**：
   - `ContextCompactionPolicyService` 计算**待异步折叠**的 `[fromSeq, toSeq]`（**不得**把近期工作集内的 `seq` 包进去）。
   - `ContextCompactionQueueService` 在幂等键不冲突时入队；主链路**不 await** 任务完成。
   - 当前这一轮的装配在**不依赖新摘要**的前提下仍须满足可回复：例如**截断/仅保留**「滚动摘要 + 自某 `seq` 起的近期全文」，使落在预算内（具体 K 与截断规则由配置与 `ContextBudgetService` 统一实现）。

### 7.2 后台压缩（异步）

1. Worker 将 Job 置为 `RUNNING`（可配合 `lockedAt`）。
2. 读取 `[fromSeq, toSeq]` 的 `AiMessage` 与（可选）现有 `rollingSummary` 前段，调用摘要模型，写入 `AiContextChunk`。
3. 在事务中**合并**到 `rollingSummary`（可约定为：拼接新段摘要、或全量重摘—首版可「旧摘要 + 新区间摘要」拼接后可选二次压缩，见未决项），**更新** `coversUpToSeq`（至少为 `toSeq`），`version++`。
4. `SUCCEEDED`；或失败则记录 `lastError`，按策略 `PENDING` 重试或 `FAILED`。

### 7.3 下一轮与工具（二期）

- 用户再次发消息时，若 Job 已完成，Loader 会自然读到**更大**的 `coversUpToSeq` 和更短的全文明文输入。
- 启用 `SearchConversationContextTool` 后，由模型在**摘要不够**时按区间或语义拉取**原始或块级**细节，避免全量进窗。

---

## 8. 错误处理与并发

- **重复入队**：依赖 `idempotencyKey` 与 Policy 对 `PENDING`/`RUNNING` 重叠区间合并或拒绝。
- **多 worker**：通过 `status`+行锁/乐观锁 或 单一活跃 Job per 范围，避免双写 `rollingSummary`；`version` 可用于写前校验。
- **摘要失败**：主链路不依赖当次成功；可继续使用「上周期的摘要 + 更激进的近期截断」作为退化策略（需在同一装配模块内显式实现，避免无提示截断导致答非所问）。

---

## 9. 可观测与配置

- 建议对以下指标打点或日志：压缩触发率、单 Job 时延、失败率、`rollingSummary` 与原文长度比、工具拉取历史次数（二期）。
- 可配置项示例：`BUDGET_CHARS` / 近期**最少保留轮数** / `maxAttempts` / 摘要模型与温度。

---

## 10. 后续扩展（非首版必做）

- 向量或全文检索：`AiContextChunk` + 外接向量或 MySQL 全文，支撑工具语义查。
- **混合**策略：入队后后台正在跑时，可短暂使用「上一条已成功的摘要 + 大窗口明文」的保守装配。
- 与 `AiCheckpointer` 若并存储在 DB，**明确**哪一侧为 `messages` 的权威源，或裁剪 checkpoint 中重复历史，避免与 Loader 双份。

---

## 11. 未决项与风险

- **合并策略**：新区间是拼入 `rollingSummary` 还是周期全量重摘，需平衡质量与成本。
- **多语言与工具/结构化消息**：`contentJson`、多模态在摘要中的可还原性，需在 `ContextCompactionProcessor` 中定义序列化与脱敏规则。
- **法律与合规**：摘要仍属用户数据，与现有删除会话级联策略（`onDelete: Cascade`）需一致。

---

## 12. 文档与实现同步

- 表结构已随迁移落地；之后若再改 `prisma/schema.prisma`，**以 schema 为最终权威**，并**回更本文**第 5 节与相关说明。
