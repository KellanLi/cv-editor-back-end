import { OmitType } from '@nestjs/swagger';
import { InfoTemplateDto as InfoTemplateTableDto } from '@/common/dto/table/info-template.dto';

export class InfoTemplateDto extends OmitType(InfoTemplateTableDto, [
  'contentTemplate',
]) {}
