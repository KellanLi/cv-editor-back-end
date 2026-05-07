import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/provider/prisma/prisma.service';
import { AiContextCompactionJobStatus } from '@/generated/enums';

@Injectable()
export class ContextCompactionPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 若已存在与 `[fromSeq, toSeq]` 重叠的 PENDING/RUNNING 任务，则不再入队。
   */
  async hasPendingOrRunningOverlap(
    conversationId: number,
    fromSeq: number,
    toSeq: number,
  ): Promise<boolean> {
    const hit = await this.prisma.aiContextCompactionJob.findFirst({
      where: {
        conversationId,
        status: {
          in: [
            AiContextCompactionJobStatus.PENDING,
            AiContextCompactionJobStatus.RUNNING,
          ],
        },
        AND: [{ fromSeq: { lte: toSeq } }, { toSeq: { gte: fromSeq } }],
      },
      select: { id: true },
    });
    return hit != null;
  }
}
