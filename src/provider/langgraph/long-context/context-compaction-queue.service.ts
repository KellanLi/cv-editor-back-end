import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@/generated/client';
import { PrismaService } from '@/provider/prisma/prisma.service';
import { AiContextCompactionJobStatus } from '@/generated/enums';
import { ContextCompactionProcessorService } from './context-compaction-processor.service';
import { makeCompactionIdempotencyKey } from './context-budget.util';

@Injectable()
export class ContextCompactionQueueService {
  private readonly logger = new Logger(ContextCompactionQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly processor: ContextCompactionProcessorService,
  ) {}

  /**
   * 将 `[fromSeq,toSeq]` 入队；`idempotencyKey` 冲突时若已存在为 PENDING/FAILED 则仍会触发 `runJob` 一次。
   */
  tryEnqueue(conversationId: number, fromSeq: number, toSeq: number): void {
    if (fromSeq > toSeq) {
      return;
    }
    const idempotencyKey = makeCompactionIdempotencyKey(
      conversationId,
      fromSeq,
      toSeq,
    );
    void (async () => {
      let jobId: number | null = null;
      try {
        const j = await this.prisma.aiContextCompactionJob.create({
          data: {
            conversationId,
            fromSeq,
            toSeq,
            status: AiContextCompactionJobStatus.PENDING,
            idempotencyKey,
            attempts: 0,
            maxAttempts: 5,
          },
        });
        jobId = j.id;
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          const existing = await this.prisma.aiContextCompactionJob.findFirst({
            where: { idempotencyKey },
          });
          if (
            existing &&
            (existing.status === AiContextCompactionJobStatus.PENDING ||
              existing.status === AiContextCompactionJobStatus.FAILED)
          ) {
            jobId = existing.id;
          }
        } else {
          this.logger.warn(
            `compaction create failed: ${e instanceof Error ? e.message : e}`,
          );
        }
      }
      if (jobId == null) {
        return;
      }
      setImmediate(() => {
        const id = jobId;
        void this.processor
          .runJob(id)
          .catch((err) =>
            this.logger.warn(
              `processor runJob ${String(id)}: ${
                err instanceof Error ? err.message : err
              }`,
            ),
          );
      });
    })();
  }
}
