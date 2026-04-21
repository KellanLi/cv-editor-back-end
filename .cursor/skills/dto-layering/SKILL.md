---
name: dto-layering
description: cv-editor-back-end 中 API DTO 分层（table / business / 模块 dto）与 @ApiResponseWrapper 选型；以 content-template 为参考。新增或调整模块 DTO、区分「持久化实体」与「操作响应」时使用。
---

# DTO 类型定义方案（cv-editor-back-end）

以 `src/modules/content-template/` 与 `src/common/dto/table/`、`src/common/dto/business/` 为参考。

## 三层职责

| 位置 | 职责 | 典型类名 |
|------|------|----------|
| `src/common/dto/table/` | 与 **Prisma 模型字段** 对齐的输入/中间结构；可含可选 relation 嵌套。 | `ContentTemplateTableDto`、`ResumeTableDto` |
| `src/common/dto/business/` | **对外暴露的持久化实体**：由对应 `table` DTO 用 `OmitType` / `PickType` / `PartialType` 等派生，去掉密码、循环引用或不应返回的 relation。供 `@ApiResponseWrapper` 在 **单实体 CRUD** 成功时作为 `data` 类型。 | `ContentTemplateDto`、`ResumeDto` |
| `src/modules/<name>/dto/` | **① 请求体**：`Create*`、`Update*`、`Delete*`、`List*`（含 `Filter*`、分页组合）。**② 无独立表、或 `data` 不是单行实体时的响应体**：如列表包一层、上传结果等。 | `ListContentTemplateDto`、`ListContentTemplateDataDto` |

## 放置规则（决策）

1. **有 Prisma 表、且接口 `data` 表示「一行业务实体」**  
   → 在 `table/` 定义表形状，在 `business/` 定义对外实体，`@ApiResponseWrapper(EntityDto)`。  
   例：`content-template` 的 `create` / `update` / `delete` → `ContentTemplateDto`。

2. **列表接口：`data` 含 `list` + `pagination`（或其它聚合字段）**  
   → `ListXxxDto`（请求）与 `ListXxxDataDto`（响应）放在 **`src/modules/<name>/dto/list.dto.ts`**；其中 `list` 元素类型引用 **`@/common/dto/business/`** 下实体 DTO。  
   例：`ListContentTemplateDataDto.list: ContentTemplateDto[]`。

3. **无对应 Prisma 模型、仅为某次操作的响应形状**（上传结果、统计汇总、第三方回调摘要等）  
   → **不要**放进 `src/common/dto/business/`（该目录保留给「持久化实体」）。  
   → 放在 **`src/modules/<name>/dto/<动作>.dto.ts`**，类名建议 **`动词 + 领域短名 + DataDto`**，与 `ListContentTemplateDataDto` 的 `*DataDto` 后缀一致。  
   例：存储模块上传成功 → `src/modules/storage/dto/upload.dto.ts` 中的 `UploadStorageDataDto`。

4. **分页结构**  
   → 复用 `src/common/dto/pagination.dto.ts`。

## Swagger 与校验

- 请求 DTO：`@ApiProperty` + `class-validator` / `class-transformer`（与现有模块一致）。
- 作为 `@ApiResponseWrapper` 的 **响应** DTO：至少完整 `@ApiProperty`；若与 `content-template` 的 `ListContentTemplateDataDto` 一致，可对字段加校验装饰器以便 Swagger 与运行时对齐（按需）。

## 与 `nest-module` skill 的关系

Controller 路径、`POST` 约定、`JwtGuard` 等见 `.cursor/skills/nest-module/SKILL.md`；**DTO 放哪一层**以本 skill 为准。
