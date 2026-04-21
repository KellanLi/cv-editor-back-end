import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ContentTableDto } from './content.dto';
import { ResumeTableDto } from './resume.dto';

export class SectionTableDto {
  @ApiProperty({
    example: 1,
    description: '模块ID',
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    example: 1,
    description: '简历ID',
  })
  @IsNumber()
  resumeId: number;

  @ApiProperty({
    example: 1,
    description: '内容模板ID',
  })
  @IsNumber()
  contentTemplateId: number;

  @ApiProperty({
    type: () => [ContentTableDto],
    description: '内容',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ContentTableDto)
  contents?: ContentTableDto[];

  @ApiProperty({
    type: () => ResumeTableDto,
    description: '简历信息',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResumeTableDto)
  resume?: ResumeTableDto;
}
