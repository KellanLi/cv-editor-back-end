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
import { AiMessageTableDto } from './ai-message.dto';
import { AiConversationPurpose } from '@/generated/enums';

export class AiConversationTableDto {
  @ApiProperty({ example: 1, description: 'AI 对话线程 ID' })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 1, description: '简历 ID' })
  @IsNumber()
  resumeId: number;

  @ApiProperty({
    description: '用途（与 Prisma 枚举一致）',
    enum: Object.values(AiConversationPurpose),
    example: AiConversationPurpose.BASIC_QA,
  })
  @IsIn(Object.values(AiConversationPurpose))
  purpose: AiConversationPurpose;

  @ApiProperty({
    description: 'LangGraph / checkpointer 线程 ID',
    example: 'thread-uuid-or-cuid',
  })
  @IsString()
  threadId: string;

  @ApiProperty({
    description: '会话标题',
    required: false,
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  title: string | null;

  @ApiProperty({
    description: '业务状态，如 active / archived',
    example: 'active',
  })
  @IsString()
  status: string;

  @ApiProperty({
    description: '最后一条消息时间',
    required: false,
    nullable: true,
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDate({ message: 'lastMsgAt 格式不正确' })
  lastMsgAt: Date | null;

  @ApiProperty({ description: '创建时间' })
  @IsDate({ message: '创建时间格式不正确' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @IsDate({ message: '更新时间格式不正确' })
  updatedAt: Date;

  @ApiProperty({
    type: () => [AiMessageTableDto],
    description: '消息列表',
    required: false,
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AiMessageTableDto)
  messages?: AiMessageTableDto[];
}
