import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNumber, IsOptional, IsString } from 'class-validator';

export class AiContextChunkTableDto {
  @ApiProperty({ example: 1, description: '分块 ID' })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 1, description: '所属对话线程 ID' })
  @IsNumber()
  conversationId: number;

  @ApiProperty({ example: 1, description: '起 seq' })
  @IsNumber()
  startSeq: number;

  @ApiProperty({ example: 3, description: '止 seq' })
  @IsNumber()
  endSeq: number;

  @ApiProperty({ description: '本段压缩摘要' })
  @IsString()
  summary: string;

  @ApiProperty({ required: false, description: '产出该块的任务 ID' })
  @IsOptional()
  @IsNumber()
  producedByJobId: number | null;

  @ApiProperty({ required: false, description: '原文归一化 hash' })
  @IsOptional()
  @IsString()
  sourceHash: string | null;

  @ApiProperty({ description: '创建时间' })
  @IsDate({ message: 'createdAt 格式不正确' })
  createdAt: Date;
}
