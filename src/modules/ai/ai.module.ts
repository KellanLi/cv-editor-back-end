import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { LanggraphModule } from '@/provider/langgraph/langgraph.module';
import { LongContextModule } from './long-context/long-context.module';
import { ResumeDiagnosisService } from './resume-diagnosis.service';
import { ResumeDiagnosisTaskRepository } from './resume-diagnosis-task.repository';
import { ResumeDiagnosisTaskService } from './resume-diagnosis-task.service';
import { ResumeDiagnosisTaskWorkerService } from './resume-diagnosis-task-worker.service';

@Module({
  imports: [LanggraphModule, LongContextModule],
  controllers: [AiController],
  providers: [
    AiService,
    ResumeDiagnosisService,
    ResumeDiagnosisTaskRepository,
    ResumeDiagnosisTaskService,
    ResumeDiagnosisTaskWorkerService,
  ],
})
export class AiModule {}
