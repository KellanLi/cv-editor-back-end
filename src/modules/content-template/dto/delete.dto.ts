import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class DeleteContentTemplateDto {
  @ApiProperty({
    description: '模块ID',
    example: 1,
  })
  @IsNumber()
  id: number;
}
