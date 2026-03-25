import { OmitType } from '@nestjs/swagger';
import { ContentTemplateDtoTable as ContentTemplateTableDto } from '@/common/dto/table/content-template.dto';

export class ContentTemplateDto extends OmitType(ContentTemplateTableDto, [
  'infoTemplates',
  'user',
]) {}
