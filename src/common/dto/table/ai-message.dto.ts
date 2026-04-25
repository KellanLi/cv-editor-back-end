import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiToolCallTableDto } from './ai-tool-call.dto';
import { AiMessageRole } from '@/generated/enums';

export class AiMessageTableDto {
  @ApiProperty({ example: 1, description: '消息 ID' })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 1, description: '对话线程 ID' })
  @IsNumber()
  conversationId: number;

  @ApiProperty({ example: 0, description: '同一会话内顺序，从 0 递增' })
  @IsNumber()
  seq: number;

  @ApiProperty({
    description: '消息角色',
    enum: Object.values(AiMessageRole),
    example: AiMessageRole.user,
  })
  @IsIn(Object.values(AiMessageRole))
  role: AiMessageRole;

  @ApiProperty({ required: false, description: '主展示文本' })
  @IsOptional()
  @IsString()
  text: string | null;

  @ApiProperty({
    required: false,
    description: '多段/结构化内容（JSON，与存库 contentJson 一致）',
  })
  @IsOptional()
  contentJson: unknown;

  @ApiProperty({
    required: false,
    description: '模型/渠道元数据（JSON，如 token usage）',
  })
  @IsOptional()
  providerMeta: unknown;

  @ApiProperty({ description: '创建时间' })
  @IsDate({ message: '创建时间格式不正确' })
  createdAt: Date;

  @ApiProperty({
    type: () => [AiToolCallTableDto],
    required: false,
    description: '同轮工具调用',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AiToolCallTableDto)
  toolCalls?: AiToolCallTableDto[];
}
