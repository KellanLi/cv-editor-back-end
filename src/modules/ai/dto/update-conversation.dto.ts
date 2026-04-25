import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateAiConversationDto {
  @ApiProperty({ description: '对话线程 ID' })
  @IsNumber()
  id: number;

  @ApiProperty({ required: false, description: '新标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    required: false,
    description: '业务状态，如 active / archived',
  })
  @IsOptional()
  @IsString()
  status?: string;
}
