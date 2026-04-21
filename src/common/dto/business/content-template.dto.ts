import { ApiProperty, OmitType } from '@nestjs/swagger';
import { ContentTemplateTableDto } from '@/common/dto/table/content-template.dto';
import { InfoTemplateDto } from './info-template.dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ContentTemplateDto extends OmitType(ContentTemplateTableDto, [
  'infoTemplates',
  'user',
]) {
  @ApiProperty({
    type: () => [InfoTemplateDto],
    description: '信息层',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InfoTemplateDto)
  infoTemplates?: InfoTemplateDto[];
}
