import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ContentTableDto } from './content.dto';
import { Type } from 'class-transformer';

export class InfoTableDto {
  @ApiProperty({
    example: 1,
    description: '信息ID',
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    example: 1,
    description: '内容ID',
  })
  @IsNumber()
  contentId: number;

  @ApiProperty({
    example: 1,
    description: '排序',
  })
  @IsNumber()
  order: number;

  @ApiProperty({
    example: 'xxx',
    description: '信息层类型',
  })
  @IsString()
  type: string;

  @ApiProperty({
    example: ['value1', 'value2'],
    description: '信息层字段值（JSON，与前端约定一致）',
  })
  values: unknown;

  @ApiProperty({
    type: () => ContentTableDto,
    description: '内容',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContentTableDto)
  content?: ContentTableDto;
}
