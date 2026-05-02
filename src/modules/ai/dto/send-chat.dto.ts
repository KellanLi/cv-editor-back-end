import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiConversationPurpose } from '@/generated/enums';

/** AI 基础问答：多轮/新建线程的入参（与流式/非流式共用的请求体；服务端返回形态另见 chat-stream DTO 若你拆分） */
export class SendAiChatDto {
  @ApiProperty({ description: '简历 ID' })
  @IsNumber()
  @Type(() => Number)
  resumeId: number;

  @ApiProperty({
    required: false,
    description: '已有对话；不传则在本简历下自动新建线程',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  conversationId?: number;

  @ApiProperty({
    required: false,
    default: 'BASIC_QA',
    description:
      '本轮对话模式。新建线程时作为初始 purpose；有 conversationId 且传该字段时，将切换该线程 purpose（可在 BASIC_QA / DIALOGUE_EDIT 间切换）。',
    enum: Object.values(AiConversationPurpose),
  })
  @IsOptional()
  @IsIn(Object.values(AiConversationPurpose))
  purpose?: AiConversationPurpose;

  @ApiProperty({ description: '用户问题' })
  @IsString()
  userMessage: string;

  @ApiProperty({
    type: [Number],
    required: false,
    description: '选中的 Section ID 列表，用于限定/告知简历上下文的取数范围',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  selectedSectionIds?: number[];

  @ApiProperty({
    required: false,
    default: false,
    description:
      '是否挂载联网工具 web_search（Tavily）。**默认为否**；需检索时必须传 `true`（且服务端配置 TAVILY_API_KEY 才会真正出网，否则工具会返回需配置 key 的说明）。',
  })
  @IsOptional()
  @IsBoolean()
  enableWebSearch?: boolean;
}
