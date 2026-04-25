import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { AiConversationPurpose } from '@/generated/enums';

export class CreateAiConversationDto {
  @ApiProperty({ description: '简历 ID' })
  @IsNumber()
  resumeId: number;

  @ApiProperty({
    required: false,
    default: 'BASIC_QA',
    description: '对话用途，默认与「AI 基础问答」一致',
    enum: Object.values(AiConversationPurpose),
  })
  @IsOptional()
  @IsIn(Object.values(AiConversationPurpose))
  purpose?: AiConversationPurpose;

  @ApiProperty({ required: false, description: '展示标题' })
  @IsOptional()
  @IsString()
  title?: string;
}
