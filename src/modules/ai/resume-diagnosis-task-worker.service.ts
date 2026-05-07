import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import type { Prisma } from '@/generated/client';
import type { DiagnoseResumeDto } from './dto/diagnose-resume.dto';
import { ResumeDiagnosisService } from './resume-diagnosis.service';
import { ResumeDiagnosisTaskRepository } from './resume-diagnosis-task.repository';

@Injectable()
export class ResumeDiagnosisTaskWorkerService {
  private readonly logger = new Logger(ResumeDiagnosisTaskWorkerService.name);
  private readonly tickMs: number;
  private ticking = false;
  private lastRunAt = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly taskRepo: ResumeDiagnosisTaskRepository,
    private readonly diagnosisService: ResumeDiagnosisService,
  ) {
    const value = this.config.get<number>('ai.resumeDiagnosisTaskWorkerIntervalMs');
    this.tickMs = typeof value === 'number' && value >= 1000 ? value : 3000;
  }

  kick(): void {
    void this.runOnce();
  }

  @Interval(1000)
  async tick(): Promise<void> {
    await this.runOnce();
  }

  private async runOnce(): Promise<void> {
    if (this.ticking) {
      return;
    }
    const now = Date.now();
    if (this.lastRunAt !== 0 && now - this.lastRunAt < this.tickMs) {
      return;
    }
    this.lastRunAt = now;
    this.ticking = true;
    try {
      await this.taskRepo.cleanupExpired(new Date());
      await this.processNextTask();
    } catch (error) {
      this.logger.warn(
        `task worker tick failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.ticking = false;
    }
  }

  private async processNextTask(): Promise<void> {
    const claimedAt = new Date();
    const task = await this.taskRepo.claimNextQueuedTask(claimedAt);
    if (!task) {
      return;
    }

    const queuedMs = claimedAt.getTime() - task.createdAt.getTime();
    this.logger.log(
      `[resume-diagnosis-task] claimed taskId=${task.id} userId=${String(task.userId)} resumeId=${String(task.resumeId)} queuedMs=${String(queuedMs)}`,
    );

    const request = this.parseRequestPayload(task.requestPayload, task.resumeId);
    const executeStartedAt = Date.now();
    try {
      const { report } = await this.diagnosisService.diagnoseForUserId(
        request,
        task.userId,
      );
      const updated = await this.taskRepo.markSucceeded(
        task.id,
        report as unknown as Prisma.InputJsonValue,
        new Date(),
      );
      const executeMs = Date.now() - executeStartedAt;
      if (updated.count === 1) {
        this.logger.log(
          `[resume-diagnosis-task] succeeded taskId=${task.id} executeMs=${String(executeMs)}`,
        );
      } else {
        this.logger.warn(
          `[resume-diagnosis-task] completion skipped taskId=${task.id} (possibly cancelled)`,
        );
      }
    } catch (error) {
      const executeMs = Date.now() - executeStartedAt;
      const failureCategory =
        error instanceof HttpException ? 'business' : 'system';
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (failureCategory === 'system') {
        this.logger.error(
          `[resume-diagnosis-task] failed taskId=${task.id} category=${failureCategory} executeMs=${String(executeMs)} reason=${errorMessage}`,
          error instanceof Error ? error.stack : undefined,
        );
      } else {
        this.logger.warn(
          `[resume-diagnosis-task] failed taskId=${task.id} category=${failureCategory} executeMs=${String(executeMs)} reason=${errorMessage}`,
        );
      }

      const updated = await this.taskRepo.markFailed({
        taskId: task.id,
        errorMessage,
        failureCategory,
        finishedAt: new Date(),
      });
      if (updated.count !== 1) {
        this.logger.warn(
          `[resume-diagnosis-task] fail-finalize skipped taskId=${task.id} (possibly cancelled)`,
        );
      }
    }
  }

  private parseRequestPayload(
    value: unknown,
    resumeId: number,
  ): DiagnoseResumeDto {
    if (!value || typeof value !== 'object') {
      return { resumeId };
    }
    const input = value as {
      targetRole?: unknown;
      enableWebSearch?: unknown;
    };
    return {
      resumeId,
      ...(typeof input.targetRole === 'string'
        ? { targetRole: input.targetRole }
        : {}),
      ...(typeof input.enableWebSearch === 'boolean'
        ? { enableWebSearch: input.enableWebSearch }
        : {}),
    };
  }
}
