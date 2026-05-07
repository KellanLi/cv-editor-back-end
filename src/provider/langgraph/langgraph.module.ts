import { Module } from '@nestjs/common';
import { LanggraphService } from './langgraph.service';
import { SectionModule } from '@/modules/section/section.module';

@Module({
  imports: [SectionModule],
  providers: [LanggraphService],
  exports: [LanggraphService],
})
export class LanggraphModule {}
