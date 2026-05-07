import { ApiProperty } from '@nestjs/swagger';
import { DiagnoseResumeDto } from './diagnose-resume.dto';

export class StartDiagnoseResumeTaskDto extends DiagnoseResumeDto {}

export class StartDiagnoseResumeTaskDataDto {
  @ApiProperty()
  taskId: string;

  @ApiProperty({
    enum: ['queued', 'running', 'succeeded', 'failed', 'cancelled'],
  })
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

  @ApiProperty({ description: 'ISO 时间字符串' })
  createdAt: string;

  @ApiProperty({ description: 'ISO 时间字符串' })
  updatedAt: string;
}
