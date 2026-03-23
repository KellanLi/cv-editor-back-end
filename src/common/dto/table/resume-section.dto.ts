import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { SectionDto } from './section.dto';
import { ResumeDto } from './resume.dto';
import { Type } from 'class-transformer';

// model ResumeSection {
//   resumeId  Int
//   sectionId Int
//   order     Int
//   resume    Resume  @relation(fields: [resumeId], references: [id])
//   section   Section @relation(fields: [sectionId], references: [id])

//   @@id([resumeId, sectionId])
// }

export class ResumeSectionDto {
  @ApiProperty({
    example: 1,
    description: '简历ID',
  })
  @IsNumber()
  resumeId: number;

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
    type: () => ResumeDto,
    description: '简历信息',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResumeDto)
  resume?: ResumeDto;

  @ApiProperty({
    type: () => SectionDto,
    description: '模块信息',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SectionDto)
  section?: SectionDto;
}
