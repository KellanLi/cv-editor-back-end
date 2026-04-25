import { AiToolCallTableDto } from '@/common/dto/table/ai-tool-call.dto';

/** 与 Prisma 表一致的对外消息内嵌工具块（可进一步 Omit 敏感字段时在此派生） */
export class AiToolCallDto extends AiToolCallTableDto {}
