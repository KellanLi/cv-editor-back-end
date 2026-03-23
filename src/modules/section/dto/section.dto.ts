import { ApiProperty, OmitType } from '@nestjs/swagger';
import { SectionDto as SectionTableDto } from '@/common/dto/table/section.dto';
import { ContentTemplateDto } from './content-template.dto';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SectionDto extends OmitType(SectionTableDto, [
  'contents',
  'resumeSections',
  'contentTemplate',
]) {
  @ApiProperty({
    type: () => ContentTemplateDto,
    description: '内容模板',
  })
  @ValidateNested({ each: true })
  @Type(() => ContentTemplateDto)
  contentTemplate?: ContentTemplateDto;
}
