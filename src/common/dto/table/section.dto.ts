import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ResumeSectionDto } from './resume-section.dto';
import { Type } from 'class-transformer';
import { ContentTemplateDto } from './content-template.dto';
import { ContentDto } from './content.dto';

// model Section {
//   id              Int              @id @default(autoincrement())
//   resumeId        Int
//   name            String
//   resumeSections  ResumeSection[]
//   contentTemplate ContentTemplate?
//   contents        Content[]
// }

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
    example: '模块名称',
    description: '模块名称',
  })
  @IsString()
  name: string;

  @ApiProperty({
    type: () => [ResumeSectionDto],
    description: '简历模块',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ResumeSectionDto)
  resumeSections?: ResumeSectionDto[];

  @ApiProperty({
    type: () => ContentTemplateDto,
    description: '内容模板',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ContentTemplateDto)
  contentTemplate?: ContentTemplateDto;

  @ApiProperty({
    type: () => [ContentDto],
    description: '内容',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ContentDto)
  contents?: ContentDto[];
}
