import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ContentTemplateTableDto } from './content-template.dto';

export class InfoTemplateTableDto {
  @ApiProperty({
    example: 1,
    description: '信息模板ID',
  })
  @IsNumber()
  id!: number;

  @ApiProperty({
    example: 1,
    description: '内容模板ID',
  })
  @IsNumber()
  contentTemplateId!: number;

  @ApiProperty({
    example: 'xxx',
    description: '信息层类型',
  })
  @IsString()
  type: string;

  @ApiProperty({
    example: ['value1', 'value2'],
    description: '信息值数组',
  })
  @IsArray()
  @IsString({ each: true })
  names: string[];

  @ApiProperty({
    example: 1,
    description: '排序顺序',
  })
  @IsNumber()
  order: number;

  @ApiProperty({
    type: () => ContentTemplateTableDto,
    description: '内容模板信息',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContentTemplateTableDto)
  contentTemplate?: ContentTemplateTableDto;
}
