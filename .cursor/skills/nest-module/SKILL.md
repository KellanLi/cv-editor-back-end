---
name: nest-module-development
description: cv-editor-back-end 中 Nest 业务模块（src/modules）的目录、DTO 分层、Controller/Service 与 Swagger 约定。在新增或改写 modules 下功能、对齐 content-template / resume 风格时使用。
---

# Nest 业务模块开发约定（cv-editor-back-end）

以 `src/modules/content-template/` 为参考实现。

## 目录与文件命名

- 模块目录：`src/modules/<kebab-or-short-name>/`
- 核心文件：`<name>.module.ts`、`<name>.controller.ts`、`<name>.service.ts`
- 模块内 `dto/`：按动作拆文件，**请求体**（`create.dto.ts`、`delete.dto.ts`、`list.dto.ts` 等）与**无 Prisma 实体对应的响应体**（如 `List*DataDto`、`Upload*DataDto`）均放此处；与表绑定的**单行实体**响应形状见 `common/dto/business/`（见 `dto-layering` skill）。
  - 非 CRUD 动词用清晰文件名，如 `update-content.dto.ts`、`upload.dto.ts`

## DTO 分层（重要）

细则与「无表模型的操作响应放哪里」见 **`.cursor/skills/dto-layering/SKILL.md`**；下表为摘要。

| 位置 | 用途 |
|------|------|
| `src/common/dto/table/` | 与 Prisma 表/关系接近的字段定义，可含可选嵌套（如 `user`、`infoTemplates`）。 |
| `src/common/dto/business/` | **持久化业务实体** 的对外形状：通常用 `OmitType` / `PickType` / `PartialType` 从对应 `table` DTO 派生；供 `@ApiResponseWrapper` 在返回**单行实体**时使用。 |
| `src/modules/<name>/dto/` | **请求**：`Create*`、`Update*`、`Delete*`、`List*`（含 `Filter*`、分页）。**响应**：列表包一层的 `List*DataDto`、上传结果等**无对应 Prisma 实体**的 `*DataDto`，均放在本目录按动作拆文件。 |
| `src/common/dto/pagination.dto.ts` | 列表分页结构复用。 |

列表响应：`ListXxxDataDto` 放在模块的 `dto/list.dto.ts` 中，其中 `list` 元素类型引用 **`@/common/dto/business/`** 下的 DTO（与 `content-template` 的 `ListContentTemplateDataDto` → `ContentTemplateDto` 一致）。

**不要**把「无表模型、仅某接口专用」的响应 DTO 放进 `common/dto/business/`；应放在对应模块的 `dto/` 下（与 `dto-layering` 一致）。

## Controller 约定

- 类级：`@UseGuards(JwtGuard)`；`@ApiTags('…模块')` 使用中文业务标签。
- 路由类级：`@Controller('<kebab-case>')`（如 `content-template`）。
- **统一使用 `POST`**，动作用路径区分：`@Post('list')`、`create`、`delete`、`update` 等。
- 每个接口：`@ApiOperation`、`@ApiBody({ type: ... })`；成功响应类型用 `@ApiResponseWrapper(...)`，参数为 **business 实体 DTO**、**模块内 `*DataDto`（列表/上传等）** 或其它已在 `dto-layering` 中约定的响应类。
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
