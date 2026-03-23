import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsDate, ValidateNested, IsOptional } from 'class-validator';
import { SectionDto } from './section.dto';
import { Type } from 'class-transformer';
import { InfoTemplateDto } from './info-template.dto';

// model ContentTemplate {
//   id            Int            @id @default(autoincrement())
//   sectionId     Int            @unique
//   createdAt     DateTime       @default(now())
//   section       Section        @relation(fields: [sectionId], references: [id])
//   infoTemplates InfoTemplate[]
// }

export class ContentTemplateDto {
  @ApiProperty({
    example: 1,
    description: '内容模板ID',
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
    example: '2023-01-01T00:00:00.000Z',
    description: '创建时间',
  })
  @IsDate({ message: '创建时间格式不正确' })
  createdAt: Date;

  @ApiProperty({
    type: () => SectionDto,
    description: '模块信息',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SectionDto)
  section?: SectionDto;

  @ApiProperty({
    type: () => [InfoTemplateDto],
    description: '信息层',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InfoTemplateDto)
  infoTemplates?: InfoTemplateDto[];
}
