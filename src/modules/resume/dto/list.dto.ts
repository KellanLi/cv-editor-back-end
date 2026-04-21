import { PaginationDto } from '@/common/dto/pagination.dto';
import { ResumeDto } from '@/common/dto/business/resume.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterResumeDto {
  @ApiProperty({
    description: '简历标题（模糊匹配）',
    example: '实习',
    type: String,
  })
  @IsString()
  title: string;
}

export class ListResumeDto {
  @ApiProperty({
    description: '过滤参数',
    type: FilterResumeDto,
  })
  @ValidateNested()
  @Type(() => FilterResumeDto)
  filter: FilterResumeDto;

  @ApiProperty({
    description: '分页参数',
    type: PaginationDto,
  })
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination: PaginationDto;
}

export class ListResumeDataDto {
  @ApiProperty({
    description: '列表数据',
    type: [ResumeDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeDto)
  list: ResumeDto[];
  @ApiProperty({
    description: '分页参数',
    type: PaginationDto,
  })
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination: PaginationDto;
}
