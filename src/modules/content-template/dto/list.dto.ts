import { PaginationDto } from '@/common/dto/pagination.dto';
import { ContentTemplateDto } from '../../../common/dto/business/content-template.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterDto {
  @ApiProperty({
    description: '模块名称',
    example: '教育经历',
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
    type: [ContentTemplateDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentTemplateDto)
  list: ContentTemplateDto[];
  @ApiProperty({
    description: '分页参数',
    type: PaginationDto,
  })
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination: PaginationDto;
}
