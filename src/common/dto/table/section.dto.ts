import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContentDto } from './content.dto';
import { ResumeDto } from './resume.dto';

export class SectionDto {
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
    example: 'basic',
    description: '内容模板类型',
  })
  @IsString()
  contentTemplateType: string;

  @ApiProperty({
    type: () => [ContentDto],
    description: '内容',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ContentDto)
  contents?: ContentDto[];

  @ApiProperty({
    type: () => ResumeDto,
    description: '简历信息',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResumeDto)
  resume: ResumeDto;
}
