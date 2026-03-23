import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class PaginationDto {
  @ApiProperty({
    description: '页码',
    example: 1,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page: number;

  @ApiProperty({
    description: '每页数量',
    example: 10,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  pageSize: number;

  @ApiProperty({
    description: '总数',
    example: 10,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  total: number;
}
