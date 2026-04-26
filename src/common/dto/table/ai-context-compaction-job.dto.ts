import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { AiContextCompactionJobStatus } from '@/generated/enums';

export class AiContextCompactionJobTableDto {
  @ApiProperty({ example: 1, description: '任务 ID' })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 1, description: '所属对话线程 ID' })
  @IsNumber()
  conversationId: number;

  @ApiProperty({ example: 1, description: '要折叠的 seq 闭区间下界' })
  @IsNumber()
  fromSeq: number;

  @ApiProperty({ example: 3, description: '要折叠的 seq 闭区间上界' })
  @IsNumber()
  toSeq: number;

  @ApiProperty({
    enum: Object.values(AiContextCompactionJobStatus),
    example: AiContextCompactionJobStatus.PENDING,
  })
  @IsIn(Object.values(AiContextCompactionJobStatus))
  status: AiContextCompactionJobStatus;

  @ApiProperty({ example: '1:1:10', description: '去重/幂等键' })
  @IsString()
  idempotencyKey: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  attempts: number;

  @ApiProperty({ example: 5, description: '最大重试（含首跑）' })
  @IsNumber()
  maxAttempts: number;

  @ApiProperty({ required: false, description: '末次失败信息' })
  @IsOptional()
  @IsString()
  lastError: string | null;

  @ApiProperty({ required: false, description: '计划执行/重试时间' })
  @IsOptional()
  @IsDate({ message: 'scheduledAt 格式不正确' })
  scheduledAt: Date | null;

  @ApiProperty({ required: false, description: '工作进程占用时间' })
  @IsOptional()
  @IsDate({ message: 'lockedAt 格式不正确' })
  lockedAt: Date | null;

  @ApiProperty({ required: false, description: '开始处理时间' })
  @IsOptional()
  @IsDate({ message: 'startedAt 格式不正确' })
  startedAt: Date | null;

  @ApiProperty({ required: false, description: '完成时间' })
  @IsOptional()
  @IsDate({ message: 'finishedAt 格式不正确' })
  finishedAt: Date | null;

  @ApiProperty({ description: '创建时间' })
  @IsDate({ message: 'createdAt 格式不正确' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @IsDate({ message: 'updatedAt 格式不正确' })
  updatedAt: Date;
}
