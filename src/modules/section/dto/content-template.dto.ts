import { ApiProperty, OmitType } from '@nestjs/swagger';
import { ContentTemplateDto as ContentTemplateTableDto } from '@/common/dto/table/content-template.dto';
import { InfoTemplateDto } from './info-template.dto';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ContentTemplateDto extends OmitType(ContentTemplateTableDto, [
  'section',
  'infoTemplates',
]) {
  @ApiProperty({
    type: () => [InfoTemplateDto],
    description: '信息层',
  })
  @ValidateNested({ each: true })
  @Type(() => InfoTemplateDto)
  infoTemplates: InfoTemplateDto[];
}
