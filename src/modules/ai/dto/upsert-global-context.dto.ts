import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class UpsertAiGlobalContextDto {
  @ApiProperty({ description: '简历 ID（同简历下多对话共享）' })
  @IsNumber()
  resumeId: number;

  @ApiProperty({ example: 'job_description', description: '键，如 JD' })
  @IsString()
  key: string;

  @ApiProperty({ description: '长文本' })
  @IsString()
  value: string;
}
