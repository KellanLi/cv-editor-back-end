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
    description: '与新建线程 purpose 一致；有 conversationId 时以库里为准',
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
    description: '是否允许使用联网/网页检索工具',
  })
  @IsOptional()
  @IsBoolean()
  enableWebSearch?: boolean;
}
