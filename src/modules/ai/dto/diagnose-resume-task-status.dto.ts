import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ResumeDiagnosisReportDto } from './diagnose-resume-data.dto';

export class DiagnoseResumeTaskStatusDto {
  @ApiProperty()
  @IsString()
  taskId: string;
}

export class DiagnoseResumeTaskStatusDataDto {
  @ApiProperty()
  taskId: string;

  @ApiProperty()
  resumeId: number;

  @ApiProperty({
    enum: ['queued', 'running', 'succeeded', 'failed', 'cancelled'],
  })
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

  @ApiProperty({ description: 'ISO 时间字符串' })
  createdAt: string;

  @ApiProperty({ description: 'ISO 时间字符串' })
  updatedAt: string;

  @ApiProperty({ required: false })
  errorMessage?: string;

  @ApiProperty({ type: ResumeDiagnosisReportDto, required: false })
  report?: ResumeDiagnosisReportDto;
}
