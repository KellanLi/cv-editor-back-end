import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { InfoTableDto } from './info.dto';
import { Type } from 'class-transformer';
import { SectionTableDto } from './section.dto';

export class ContentTableDto {
  @ApiProperty({
    example: 1,
    description: '内容ID',
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    example: 1,
    description: '模块ID',
  })
  @IsNumber()
  sectionId: number;

  @ApiProperty({
    example: 1,
    description: '排序',
  })
  @IsNumber()
  order: number;

  @ApiProperty({
    type: () => SectionTableDto,
    description: '模块',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SectionTableDto)
  section?: SectionTableDto;

  @ApiProperty({
    type: () => [InfoTableDto],
    description: '信息层',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InfoTableDto)
  infos?: InfoTableDto[];
}
