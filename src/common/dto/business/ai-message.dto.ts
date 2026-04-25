import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AiMessageTableDto } from '@/common/dto/table/ai-message.dto';
import { AiToolCallDto } from './ai-tool-call.dto';

export class AiMessageDto extends OmitType(AiMessageTableDto, [
  'toolCalls',
] as const) {
  @ApiProperty({
    type: () => [AiToolCallDto],
    required: false,
    description: '同轮工具调用',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AiToolCallDto)
  toolCalls?: AiToolCallDto[];
}
