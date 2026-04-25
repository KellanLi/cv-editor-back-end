import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { LanggraphModule } from '@/provider/langgraph/langgraph.module';

@Module({
  imports: [LanggraphModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
