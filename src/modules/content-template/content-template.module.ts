import { Module } from '@nestjs/common';
import { ContentTemplateService } from './content-template.service';
import { ContentTemplateController } from './content-template.controller';

@Module({
  controllers: [ContentTemplateController],
  providers: [ContentTemplateService],
})
export class ContentTemplateModule {}
