import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { AiResumeDiagnosisTaskStatus } from '@/generated/enums';
import type { ResumeDiagnosisReport } from '@/provider/langgraph/resume-diagnosis';
import type { IJwtPayload } from '@/types/auth.types';
import { PrismaService } from '@/provider/prisma/prisma.service';
import type { DiagnoseResumeDto } from './dto/diagnose-resume.dto';
import { ResumeDiagnosisTaskRepository } from './resume-diagnosis-task.repository';
import { ResumeDiagnosisTaskWorkerService } from './resume-diagnosis-task-worker.service';
import type { DiagnoseResumeTaskStatusDataDto } from './dto/diagnose-resume-task-status.dto';
import type { StartDiagnoseResumeTaskDataDto } from './dto/diagnose-resume-task-start.dto';
import type { CancelDiagnoseResumeTaskDataDto } from './dto/diagnose-resume-task-cancel.dto';

@Injectable()
export class ResumeDiagnosisTaskService {
  private readonly logger = new Logger(ResumeDiagnosisTaskService.name);
  private readonly ttlHours: number;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly taskRepo: ResumeDiagnosisTaskRepository,
    private readonly taskWorker: ResumeDiagnosisTaskWorkerService,
  ) {
    const value = this.config.get<number>('ai.resumeDiagnosisTaskTtlHours');
    this.ttlHours = typeof value === 'number' && value >= 24 ? value : 24;
  }

  async startTask(
    body: DiagnoseResumeDto,
    jwt: IJwtPayload,
  ): Promise<StartDiagnoseResumeTaskDataDto> {
    const now = new Date();
    await this.assertResumeOwned(body.resumeId, jwt.id);
    this.taskWorker.kick();

    const existing = await this.taskRepo.findActiveTask(jwt.id, body.resumeId, now);
    if (existing) {
      this.logger.log(
        `[resume-diagnosis-task] reuse taskId=${existing.id} userId=${String(jwt.id)} resumeId=${String(body.resumeId)} status=${existing.status}`,
      );
      return this.toStartData(existing);
    }

    const activeKey = this.buildActiveKey(jwt.id, body.resumeId);
    const expiresAt = new Date(now.getTime() + this.ttlHours * 60 * 60 * 1000);
    const requestPayload = {
      targetRole: body.targetRole ?? null,
      enableWebSearch: body.enableWebSearch ?? false,
    };

    try {
      const task = await this.taskRepo.createTask({
        taskId: randomUUID(),
        userId: jwt.id,
        resumeId: body.resumeId,
        activeKey,
        expiresAt,
        requestPayload,
      });
      this.logger.log(
        `[resume-diagnosis-task] created taskId=${task.id} userId=${String(jwt.id)} resumeId=${String(body.resumeId)}`,
      );
      this.taskWorker.kick();
      return this.toStartData(task);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        const conflicted = await this.taskRepo.findActiveTask(
          jwt.id,
          body.resumeId,
          new Date(),
        );
        if (conflicted) {
          return this.toStartData(conflicted);
        }
      }
      throw error;
    }
  }

  async getTaskStatus(
    taskId: string,
    jwt: IJwtPayload,
  ): Promise<DiagnoseResumeTaskStatusDataDto> {
    const task = await this.taskRepo.findTaskForUser(taskId, jwt.id, new Date());
    if (!task) {
      throw new NotFoundException('诊断任务不存在');
    }
    return this.toStatusData(task);
  }

  async cancelTask(
    taskId: string,
    jwt: IJwtPayload,
  ): Promise<CancelDiagnoseResumeTaskDataDto> {
    const task = await this.taskRepo.findTaskForUser(taskId, jwt.id, new Date());
    if (!task) {
      throw new NotFoundException('诊断任务不存在');
    }
    if (task.status === AiResumeDiagnosisTaskStatus.CANCELLED) {
      return { taskId: task.id, status: 'cancelled' };
    }
    if (
      task.status === AiResumeDiagnosisTaskStatus.SUCCEEDED ||
      task.status === AiResumeDiagnosisTaskStatus.FAILED
    ) {
      throw new BadRequestException('任务已结束，无法取消');
    }
    await this.taskRepo.cancelTaskForUser(taskId, jwt.id, new Date());
    this.logger.log(
      `[resume-diagnosis-task] cancelled taskId=${taskId} userId=${String(jwt.id)}`,
    );
    return { taskId, status: 'cancelled' };
  }

  private async assertResumeOwned(resumeId: number, userId: number): Promise<void> {
    const owned = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId },
      select: { id: true },
    });
    if (!owned) {
      throw new NotFoundException('简历不存在');
    }
  }

  private buildActiveKey(userId: number, resumeId: number): string {
    return `${userId}:${resumeId}`;
  }

  private toApiStatus(status: AiResumeDiagnosisTaskStatus) {
    switch (status) {
      case AiResumeDiagnosisTaskStatus.QUEUED:
        return 'queued';
      case AiResumeDiagnosisTaskStatus.RUNNING:
        return 'running';
      case AiResumeDiagnosisTaskStatus.SUCCEEDED:
        return 'succeeded';
      case AiResumeDiagnosisTaskStatus.FAILED:
        return 'failed';
      case AiResumeDiagnosisTaskStatus.CANCELLED:
        return 'cancelled';
      default:
        return 'failed';
    }
  }

  private toStartData(task: {
    id: string;
    status: AiResumeDiagnosisTaskStatus;
    createdAt: Date;
    updatedAt: Date;
  }): StartDiagnoseResumeTaskDataDto {
    return {
      taskId: task.id,
      status: this.toApiStatus(task.status),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  private toStatusData(task: {
    id: string;
    resumeId: number;
    status: AiResumeDiagnosisTaskStatus;
    createdAt: Date;
    updatedAt: Date;
    errorMessage: string | null;
    report: unknown;
  }): DiagnoseResumeTaskStatusDataDto {
    return {
      taskId: task.id,
      resumeId: task.resumeId,
      status: this.toApiStatus(task.status),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      ...(task.errorMessage ? { errorMessage: task.errorMessage } : {}),
      ...(task.report
        ? { report: task.report as ResumeDiagnosisReport }
        : {}),
    };
  }
}
