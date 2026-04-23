---
name: project-cli-scripts
description: Runs Nest resource/provider scaffolds and Prisma migrate/generate via package.json scripts. Use when scaffolding modules under src/modules or providers under src/provider, after schema changes, or when the user mentions g:res, g:pro, db:migrate, or db:generate.
---

# 项目 CLI 脚本（package.json）

在仓库根目录执行；需已安装依赖（`pnpm install`）。生成类命令会调用 `pnpm dlx @nestjs/cli`，需网络拉取 CLI（若本地无缓存）。

## `pnpm g:res` — 生成业务模块（Resource）

- **定义**：`node scripts/generate-resource.js`
- **作用**：在 `src/modules/<name>/` 下执行 `nest g resource modules/<name> --no-spec`（REST 资源骨架：module + controller + service 等）。
- **用法**：

```bash
pnpm g:res <name>
```

- **示例**：`pnpm g:res resume` → 目标路径 `src/modules/resume/`（脚本内为 `modules/${name}`，相对 Nest 的 `src` 根）。
- **注意**：`<name>` 必填；与现有模块重名会冲突，需自行处理。

## `pnpm g:pro` — 生成 Provider 模块

- **定义**：`node scripts/generate-provider.js`
- **作用**：在 `src/provider/<name>/` 下依次生成 `nest g module` 与 `nest g service ... --no-spec`。
- **用法**：

```bash
pnpm g:pro <name>
```

- **示例**：`pnpm g:pro redis` → `src/provider/redis/`。
- **注意**：`<name>` 必填。

## `pnpm db:migrate` — 开发环境迁移

- **定义**：`pnpm dlx prisma migrate dev --name`（迁移名称由后续参数拼接）。
- **作用**：根据 `prisma/schema.prisma` 创建并应用迁移（开发流程）。
- **用法**（迁移名传给 Prisma 的 `--name`，建议显式使用 `--`）：

```bash
pnpm run db:migrate -- <migration_name>
```

- **示例**：`pnpm run db:migrate -- add_resume_title`
- **注意**：需配置好数据库连接（如 `.env`）；`<migration_name>` 使用简短蛇形或描述性英文。

## `pnpm db:generate` — 生成 Prisma Client

- **定义**：`pnpm dlx prisma generate`
- **作用**：按 `schema.prisma` 的 `output` 更新 `src/generated`（及关联类型）。
- **用法**：

```bash
pnpm db:generate
```

- **注意**：改 schema 后应执行；不要手改 `src/generated`。

## 典型顺序

1. 修改 `prisma/schema.prisma` → 按 `db-sync` skill 的严格顺序执行（**`db:migrate` 后必须 `db:generate`**，本项目 Prisma v7 下 `migrate dev` 不会自动 generate；随后重启 `pnpm dev`）。
2. 新业务域 → `pnpm g:res <module>`，再在 `app.module.ts` 中 `imports` 新模块（若 CLI 未自动注册）。
3. 新基础设施封装 → `pnpm g:pro <provider>`，再按需注册为全局模块或导出供其他模块使用。
