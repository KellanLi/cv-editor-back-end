import { Controller } from '@nestjs/common';
import { ContentTemplateService } from './content-template.service';

@Controller('content-template')
export class ContentTemplateController {
  constructor(private readonly contentTemplateService: ContentTemplateService) {}
}
