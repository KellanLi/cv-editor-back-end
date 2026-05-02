import { Module } from '@nestjs/common';
import { LanggraphService } from './langgraph.service';
import { ConversationContextLoaderService } from './long-context/conversation-context-loader.service';
import { ContextCompactionQueueService } from './long-context/context-compaction-queue.service';
import { ContextCompactionProcessorService } from './long-context/context-compaction-processor.service';
import { SectionModule } from '@/modules/section/section.module';
import { ContentTemplateModule } from '@/modules/content-template/content-template.module';

@Module({
  imports: [SectionModule, ContentTemplateModule],
  providers: [
    ContextCompactionProcessorService,
    ContextCompactionQueueService,
    ConversationContextLoaderService,
    LanggraphService,
  ],
  exports: [LanggraphService],
})
export class LanggraphModule {}
