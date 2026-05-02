import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class StreamResumeUpdatesDto {
  @ApiProperty({
    description: '简历ID',
    example: 1,
  })
  @IsNumber()
  resumeId: number;
}
