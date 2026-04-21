---
name: nest-module-development
description: cv-editor-back-end 中 Nest 业务模块（src/modules）的目录、DTO 分层、Controller/Service 与 Swagger 约定。在新增或改写 modules 下功能、对齐 content-template / resume 风格时使用。
---

# Nest 业务模块开发约定（cv-editor-back-end）

以 `src/modules/content-template/` 为参考实现。

## 目录与文件命名

- 模块目录：`src/modules/<kebab-or-short-name>/`
- 核心文件：`<name>.module.ts`、`<name>.controller.ts`、`<name>.service.ts`
- 请求体 DTO：集中在 `dto/`，按动作拆文件：
  - `create.dto.ts`、`delete.dto.ts`、`list.dto.ts`
  - 非 CRUD 动词用清晰文件名，如 `update-content.dto.ts`
- **不在** `src/modules/<name>/dto/` 下放「仅用于响应包装 / 与表结构强绑定的展示模型」；这类类型放在 `src/common/dto/business/`（见下）。

## DTO 分层（重要）

| 位置 | 用途 |
|------|------|
| `src/common/dto/table/` | 与 Prisma 表/关系接近的字段定义，可含可选嵌套（如 `user`、`infoTemplates`）。 |
| `src/common/dto/business/` | **对外 API 文档与 `@ApiResponseWrapper` 使用的实体 DTO**：通常用 `OmitType` / `PickType` / `PartialType` 从对应 `table` DTO 派生，去掉循环引用字段或不需要暴露的 relation。 |
| `src/modules/<name>/dto/` | **仅请求**：`Create*`、`Update*`、`Delete*`、`List*`（含 `Filter*`、`List*DataDto` 中的 filter/pagination 组合）。 |
| `src/common/dto/pagination.dto.ts` | 列表分页结构复用。 |

列表响应：`ListXxxDataDto` 放在模块的 `dto/list.dto.ts` 中，其中 `list` 元素类型引用 **`@/common/dto/business/`** 下的 DTO（与 `content-template` 的 `ListContentTemplateDataDto` → `ContentTemplateDto` 一致）。

## Controller 约定

- 类级：`@UseGuards(JwtGuard)`；`@ApiTags('…模块')` 使用中文业务标签。
- 路由类级：`@Controller('<kebab-case>')`（如 `content-template`）。
- **统一使用 `POST`**，动作用路径区分：`@Post('list')`、`create`、`delete`、`update` 等。
- 每个接口：`@ApiOperation`、`@ApiBody({ type: ... })`；成功响应类型用 `@ApiResponseWrapper(...)`，参数为 **business DTO** 或 **List*DataDto**。
- 注入当前用户：`@JwtPayload() jwt: IJwtPayload`。
- 依赖导入：优先 `@/` 别名（如 `@/common/dto/business/...`、`@/provider/jwt/jwt.guard`）。

## Service 约定

- 注入 `PrismaService`（`PrismaModule` 为 `@Global()`，子模块无需重复 `imports`）。
- 方法签名：`(params: XxxDto, jwt: IJwtPayload)`；需要时拆 `params` 的 `filter` / `pagination`。
- 资源不存在等业务错误：使用 `NotFoundException`（或其它 Nest HTTP 异常），消息为简短中文。
- 列表：`$transaction` 并行 `findMany` + `count`；`where` 中始终带上用户隔离条件（如 `userId: jwt.id` 或经 `resume.userId` 校验）。

## 模块注册

- 新模块在 `src/app.module.ts` 的 `imports` 中注册（若脚手架未自动加入需手动补上）。

## 脚手架

- 新业务域可先用 `pnpm g:res <name>` 生成骨架，再按本约定删除 REST 默认路由、改为 `POST` + 上述 DTO 结构。

## 与 Prisma / 表 DTO

- `table` 层字段应与 `schema.prisma` 同步（如 `order`、JSON 字段）；`Json` 列在 DTO 中可用 `unknown` 或项目统一类型，避免错误的 `@IsString({ each: true })` 强校验。
