import { InfoTemplateTableDto as InfoTemplateTableDto } from '@/common/dto/table/info-template.dto';
import { OmitType } from '@nestjs/swagger';

export class InfoTemplateDto extends OmitType(InfoTemplateTableDto, [
  'contentTemplate',
  'contentTemplateId',
  'id',
]) {}
