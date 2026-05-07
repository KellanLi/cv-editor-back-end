import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CancelDiagnoseResumeTaskDto {
  @ApiProperty()
  @IsString()
  taskId: string;
}

export class CancelDiagnoseResumeTaskDataDto {
  @ApiProperty()
  taskId: string;

  @ApiProperty({ enum: ['cancelled'] })
  status: 'cancelled';
}
