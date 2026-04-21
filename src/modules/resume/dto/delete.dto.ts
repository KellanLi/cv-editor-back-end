import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class DeleteResumeDto {
  @ApiProperty({
    description: '简历ID',
    example: 1,
  })
  @IsNumber()
  id: number;
}
