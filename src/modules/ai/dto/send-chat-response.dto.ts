import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiMessageDto } from '@/common/dto/business/ai-message.dto';

/** 同步「基础问答」一轮的返回体（流式接口上线前用；后续可扩展 citations、usage 等） */
export class SendAiChatDataDto {
  @ApiProperty({ description: '对话线程 ID' })
  @IsNumber()
  conversationId: number;

  @ApiProperty({ description: 'LangGraph thread_id' })
  @IsString()
  threadId: string;

  @ApiProperty({
    type: [Number],
    required: false,
    description: '本请求传入的选中 Section（回显）',
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  selectedSectionIds?: number[];

  @ApiProperty({ description: '本轮用户消息' })
  @ValidateNested()
  @Type(() => AiMessageDto)
  userMessage: AiMessageDto;

  @ApiProperty({ description: '本轮助手消息（占位：待接入百炼 / LangGraph）' })
  @ValidateNested()
  @Type(() => AiMessageDto)
  assistantMessage: AiMessageDto;
}
