import { PaginationDto } from '@/common/dto/pagination.dto';
import { SectionDto } from '@/common/dto/business/section.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterSectionDto {
  @ApiProperty({
    description: '简历ID',
    example: 1,
  })
  @IsNumber()
  resumeId: number;
}

export class ListSectionDto {
  @ApiProperty({
    description: '过滤参数',
    type: FilterSectionDto,
  })
  @ValidateNested()
  @Type(() => FilterSectionDto)
  filter: FilterSectionDto;

  @ApiProperty({
    description: '分页参数',
    type: PaginationDto,
  })
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination: PaginationDto;
}

export class ListSectionDataDto {
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
