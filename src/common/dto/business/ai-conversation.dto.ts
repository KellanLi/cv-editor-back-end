import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AiConversationTableDto } from '@/common/dto/table/ai-conversation.dto';
import { AiMessageDto } from './ai-message.dto';

export class AiConversationDto extends OmitType(AiConversationTableDto, [
  'messages',
] as const) {
  @ApiProperty({
    type: () => [AiMessageDto],
    required: false,
    description: '详情/回放时带消息',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AiMessageDto)
  messages?: AiMessageDto[];
}
