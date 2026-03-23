import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class DeleteDto {
  @ApiProperty({
    description: '模块ID',
    example: 1,
  })
  @IsNumber()
  sectionId: number;
}
