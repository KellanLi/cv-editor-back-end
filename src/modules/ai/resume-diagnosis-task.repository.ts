import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/provider/prisma/prisma.service';
import { AiResumeDiagnosisTaskStatus } from '@/generated/enums';
import { Prisma } from '@/generated/client';

type CreateTaskParams = {
  taskId: string;
  userId: number;
  resumeId: number;
  activeKey: string;
  expiresAt: Date;
  requestPayload: Prisma.InputJsonValue;
};

@Injectable()
export class ResumeDiagnosisTaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveTask(userId: number, resumeId: number, now: Date) {
    return this.prisma.aiResumeDiagnosisTask.findFirst({
      where: {
        userId,
        resumeId,
        expiresAt: { gt: now },
        status: {
          in: [
            AiResumeDiagnosisTaskStatus.QUEUED,
            AiResumeDiagnosisTaskStatus.RUNNING,
          ],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findTaskForUser(taskId: string, userId: number, now: Date) {
    return this.prisma.aiResumeDiagnosisTask.findFirst({
      where: { id: taskId, userId, expiresAt: { gt: now } },
    });
  }

  createTask(params: CreateTaskParams) {
    return this.prisma.aiResumeDiagnosisTask.create({
      data: {
        id: params.taskId,
        userId: params.userId,
        resumeId: params.resumeId,
        status: AiResumeDiagnosisTaskStatus.QUEUED,
        activeKey: params.activeKey,
        expiresAt: params.expiresAt,
        requestPayload: params.requestPayload,
      },
    });
  }

  async claimNextQueuedTask(now: Date) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.aiResumeDiagnosisTask.findFirst({
        where: {
          status: AiResumeDiagnosisTaskStatus.QUEUED,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: 'asc' },
      });
      if (!task) {
        return null;
      }
      const updated = await tx.aiResumeDiagnosisTask.updateMany({
        where: {
          id: task.id,
          status: AiResumeDiagnosisTaskStatus.QUEUED,
          expiresAt: { gt: now },
        },
        data: {
          status: AiResumeDiagnosisTaskStatus.RUNNING,
          startedAt: new Date(),
          attempts: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        return null;
      }
      return tx.aiResumeDiagnosisTask.findUnique({ where: { id: task.id } });
    });
  }

  markSucceeded(taskId: string, report: Prisma.InputJsonValue, finishedAt: Date) {
    return this.prisma.aiResumeDiagnosisTask.updateMany({
      where: { id: taskId, status: AiResumeDiagnosisTaskStatus.RUNNING },
      data: {
        status: AiResumeDiagnosisTaskStatus.SUCCEEDED,
        activeKey: null,
        report,
        errorMessage: null,
        failureCategory: null,
        finishedAt,
      },
    });
  }

  markFailed(params: {
    taskId: string;
    errorMessage: string;
    failureCategory: string;
    finishedAt: Date;
  }) {
    return this.prisma.aiResumeDiagnosisTask.updateMany({
      where: { id: params.taskId, status: AiResumeDiagnosisTaskStatus.RUNNING },
      data: {
        status: AiResumeDiagnosisTaskStatus.FAILED,
        activeKey: null,
        errorMessage: params.errorMessage.slice(0, 8000),
        failureCategory: params.failureCategory.slice(0, 32),
        finishedAt: params.finishedAt,
      },
    });
  }

  cancelTaskForUser(taskId: string, userId: number, finishedAt: Date) {
    return this.prisma.aiResumeDiagnosisTask.updateMany({
      where: {
        id: taskId,
        userId,
        status: {
          in: [
            AiResumeDiagnosisTaskStatus.QUEUED,
            AiResumeDiagnosisTaskStatus.RUNNING,
          ],
        },
      },
      data: {
        status: AiResumeDiagnosisTaskStatus.CANCELLED,
        activeKey: null,
        failureCategory: 'cancelled',
        finishedAt,
      },
    });
  }

  cleanupExpired(now: Date) {
    return this.prisma.aiResumeDiagnosisTask.deleteMany({
      where: { expiresAt: { lte: now } },
    });
  }
}
