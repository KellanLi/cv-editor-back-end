import { PaginationDto } from '@/common/dto/pagination.dto';
import { SectionDto } from './section.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';

export class FilterDto {
  @ApiProperty({
    description: '信息层类型列表',
    example: ['text', 'image'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  infoTemplateTypes: string[];

  @ApiProperty({
    description: '模块名称',
    example: 'test',
    type: String,
  })
  @IsString()
  name: string;
}

export class ListDto {
  @ApiProperty({
    description: '过滤参数',
    type: FilterDto,
  })
  @ValidateNested()
  @Type(() => FilterDto)
  filter: FilterDto;

  @ApiProperty({
    description: '分页参数',
    type: PaginationDto,
  })
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination: PaginationDto;
}

export class ListDataDto {
  @ApiProperty({
    description: '列表数据',
    type: [SectionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  list: SectionDto[];

  @ApiProperty({
    description: '分页参数',
    type: PaginationDto,
  })
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination: PaginationDto;
}
