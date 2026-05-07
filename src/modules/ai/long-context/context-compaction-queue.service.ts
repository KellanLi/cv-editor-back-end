import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/provider/prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { AiContextCompactionJobStatus } from '@/generated/enums';
import { ContextBudgetService } from './context-budget.service';
import { ContextCompactionPolicyService } from './context-compaction-policy.service';

@Injectable()
export class ContextCompactionQueueService {
  private readonly logger = new Logger(ContextCompactionQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly budget: ContextBudgetService,
    private readonly policy: ContextCompactionPolicyService,
  ) {}

  /**
   * 主链路 fire-and-forget：超预算则幂等入队，不等待 Worker。
   */
  async tryEnqueueCompactionJob(conversationId: number): Promise<void> {
    const range = await this.budget.computeCompactionRange(conversationId);
    if (!range) {
      return;
    }
    const { fromSeq, toSeq } = range;
    if (fromSeq > toSeq) {
      return;
    }
    if (
      await this.policy.hasPendingOrRunningOverlap(
        conversationId,
        fromSeq,
        toSeq,
      )
    ) {
      return;
    }

    const idempotencyKey = `${conversationId}:${fromSeq}:${toSeq}`.slice(
      0,
      255,
    );

    try {
      await this.prisma.aiContextCompactionJob.create({
        data: {
          conversationId,
          fromSeq,
          toSeq,
          idempotencyKey,
          status: AiContextCompactionJobStatus.PENDING,
        },
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        return;
      }
      this.logger.warn(
        `compaction enqueue failed conversationId=${String(conversationId)}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
