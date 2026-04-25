import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class DeleteAiConversationDto {
  @ApiProperty({ description: '对话线程 ID' })
  @IsNumber()
  id: number;
}
