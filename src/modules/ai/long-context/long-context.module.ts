import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConversationContextLoaderService } from './conversation-context-loader.service';
import { ContextBudgetService } from './context-budget.service';
import { ContextCompactionPolicyService } from './context-compaction-policy.service';
import { ContextCompactionQueueService } from './context-compaction-queue.service';
import { ContextCompactionWorkerService } from './context-compaction-worker.service';

@Module({
  imports: [ScheduleModule],
  providers: [
    ConversationContextLoaderService,
    ContextBudgetService,
    ContextCompactionPolicyService,
    ContextCompactionQueueService,
    ContextCompactionWorkerService,
  ],
  exports: [
    ConversationContextLoaderService,
    ContextCompactionQueueService,
  ],
})
export class LongContextModule {}
