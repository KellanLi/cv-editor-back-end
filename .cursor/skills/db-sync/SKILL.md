---
name: db-sync
description: >-
  cv-editor-back-end 中修改 prisma/schema.prisma 后，将变更同步到 MySQL、Prisma Client
  (src/generated) 与运行中 Nest 进程的标准流程。Use when editing prisma/schema.prisma,
  adding/renaming/removing Prisma model or field, running migrations, regenerating
  Prisma Client, or when the user hits runtime errors like "Unknown argument ..." /
  "PrismaClientValidationError" after schema changes.
---

# 数据库同步流程（schema → MySQL → Prisma Client → 运行态）

改 `prisma/schema.prisma` 后，**三步缺一不可**。Prisma v7 在本项目实测不会在 `migrate dev` 时自动执行 `generate`，所以**必须手动执行 `db:generate`**；另外 Nest watch 模式不会因 `src/generated` 变化而可靠热重启，**必须重启 `pnpm dev`**。

## 步骤（严格按顺序）

### 1. `pnpm run db:migrate -- <migration_name>`

- 作用：基于当前 `schema.prisma` 生成并应用迁移到 MySQL。
- 迁移名用简短蛇形英文，表达语义（例：`add_resume_profile_gender`、`drop_user_nickname`、`rename_info_to_layer`）。
- 必须传 `--`，否则参数会被 pnpm 吞掉。
- 失败排查：
  - `P1001 Can't reach database server`：数据库连接/网络问题。
  - `drift detected`：schema 与 DB 不一致，按 Prisma 提示选择 reset 或补迁移；**生产慎用 reset**。

### 2. `pnpm db:generate`（**不要省略**）

- 作用：按 `schema.prisma` 的 `output = "../src/generated"` 重新产出 Prisma Client 与类型。
- **本项目 Prisma v7 下 `migrate dev` 的输出通常不包含 `Generated Prisma Client ...`**，即未自动 generate。为避免"迁移成功但运行时 `Unknown argument xxx`"，本步骤一律执行。
- 成功输出应含：`✔ Generated Prisma Client (x.x.x) to ./src/generated`。

### 3. 校验 `src/generated` 已包含新字段/模型

以新增字段 `gender` 为例：

```bash
rg "gender" src/generated/models/ResumeProfile.ts | head
```

应能看到 `gender: string | null`、`gender?: ...`、`FieldRef<"ResumeProfile", 'String'>` 等条目。

> 若命中为 0 → Prisma Client 没更新到位，回到步骤 2。

### 4. 重启运行中的 Nest 进程

- `pnpm dev`（watch 模式）监听 `src/**/*.ts`，但 `src/generated` 下重写的 `.ts` 不一定触发重启，且即便重启，已加载到内存的 PrismaClient 单例也可能残留旧类型校验逻辑。
- 操作：kill 旧的 `pnpm dev` 进程并重新启动。
- 校验：调用受影响的接口（如 `/api/v1/resume/update-profile`）传入新字段，观察日志无 `PrismaClientValidationError`。

## 修改 Service / DTO 的配套动作

改 schema 时**同一轮**请完成下列联动，避免类型漂移：

- **table DTO**（`src/common/dto/table/*.dto.ts`）：镜像持久化字段，可空字段写 `string | null`。
- **business DTO**（`src/common/dto/business/*.dto.ts`）：如有面向 API 的派生视图也要同步。
- **模块 DTO**（`src/modules/<feature>/dto/*.dto.ts`）：
  - 入参 DTO（如 `update-*.dto.ts`）按"不传=不改 / `null`=清空"的模块约定加字段。
- **Service**：若 service 显式声明了 `data: { ... }` 的字面量类型（如 `resume.service.ts` 的 `updateProfile`），**必须在该类型里补齐新字段**，否则即使 Prisma Client 已更新，TS 也无法把 `...rest` 展开里的新字段传到 Prisma。

## 常见错误速查

| 运行时报错 | 根因 | 处置 |
| ---- | ---- | ---- |
| `PrismaClientValidationError: Unknown argument 'xxx'` | Prisma Client 未重新生成，或 `pnpm dev` 未重启 | 执行步骤 2 + 4 |
| TS 编译期 `Type '{ xxx: ... }' is not assignable to ...` | Service 里字面量类型没加新字段 | 补齐 `data` 类型；勿用 `as any` 绕过 |
| `Drift detected` / `Database schema is not in sync` | 手改过 DB 或有未提交迁移 | 按提示 `migrate dev`；必要时 reset 开发库 |

## 不要做

- 不要手改 `src/generated/**`（`prisma generate` 会覆盖）。
- 不要用 `prisma db push` 跳过迁移文件：本项目以 `prisma/migrations/` 为准，`db push` 不产生迁移历史。
- 不要只跑 `db:migrate` 不跑 `db:generate`（本项目 v7 行为如上）。
- 不要在 service 里用 `as any` / `@ts-ignore` 屏蔽因未 generate 导致的 TS 报错——那是流程没走完的信号。
