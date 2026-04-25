import { Module } from '@nestjs/common';
import { LanggraphService } from './langgraph.service';

@Module({
  providers: [LanggraphService],
  exports: [LanggraphService],
})
export class LanggraphModule {}
