import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 流式（SSE/ReadableStream 按行 JSON 解析时）的「一条下游事件」形状，便于与前端约定。
 * 实际生产可在 payload 中扩展 citations、checkpoint、usage 等。
 */
export class AiChatStreamEventDto {
  @ApiProperty({
    example: 'message',
    description:
      '事件阶段：message(正文增量)、reasoning(思考/推理摘要)、tool(工具事件)、meta(会话元信息)、error、done',
  })
  @IsString()
  @IsIn(['message', 'reasoning', 'tool', 'error', 'done', 'meta'])
  phase: 'message' | 'reasoning' | 'tool' | 'error' | 'done' | 'meta';

  @ApiProperty({ required: false, description: '可读的增量文本' })
  @IsOptional()
  @IsString()
  deltaText?: string;

  @ApiProperty({
    required: false,
    description: '与对话或模型相关的任意扩展 JSON',
  })
  @IsOptional()
  payload?: unknown;

  @ApiProperty({ required: false, description: '关联的对话线程 ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  conversationId?: number;
}
