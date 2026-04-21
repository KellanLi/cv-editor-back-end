import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSectionContentInfoDto {
  @ApiProperty({ description: '排序', example: 1 })
  @IsNumber()
  order: number;

  @ApiProperty({ description: '信息层类型', example: 'TITLE_PERIOD' })
  @IsString()
  type: string;

  @ApiProperty({
    description: '字段值（JSON，与模板 names 维度一致）',
    example: ['', ''],
  })
  values: unknown;
}

export class UpdateSectionContentItemDto {
  @ApiProperty({ description: '排序', example: 1 })
  @IsNumber()
  order: number;

  @ApiProperty({
    description: '该条内容的信息层',
    type: [UpdateSectionContentInfoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSectionContentInfoDto)
  infos: UpdateSectionContentInfoDto[];
}

export class UpdateSectionContentDto {
  @ApiProperty({ description: '模块ID', example: 1 })
  @IsNumber()
  sectionId: number;

  @ApiProperty({
    description: '替换该模块下全部内容与信息层（空数组表示清空）',
    type: [UpdateSectionContentItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSectionContentItemDto)
  contents: UpdateSectionContentItemDto[];
}
