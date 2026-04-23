import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class UpdateSectionDto {
  @ApiProperty({
    description: '模块ID',
    example: 1,
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: '同一简历内的展示顺序（升序）',
    example: 1,
  })
  @IsNumber()
  order: number;
}
