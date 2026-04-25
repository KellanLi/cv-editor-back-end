import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class DeleteAiGlobalContextDto {
  @ApiProperty({ description: '简历 ID' })
  @IsNumber()
  resumeId: number;

  @ApiProperty({ example: 'job_description', description: '要删除的键' })
  @IsString()
  key: string;
}
