import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNumber, IsString } from 'class-validator';

export class AiConversationContextSummaryTableDto {
  @ApiProperty({ example: 1, description: '行 ID' })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 1, description: '所属对话线程 ID' })
  @IsNumber()
  conversationId: number;

  @ApiProperty({ description: '已折叠早期历史的滚动摘要' })
  @IsString()
  rollingSummary: string;

  @ApiProperty({
    example: 0,
    description: '已合并进 rollingSummary 的最大 seq（0 表示未折叠）',
  })
  @IsNumber()
  coversUpToSeq: number;

  @ApiProperty({ example: 0, description: '乐观并发版本' })
  @IsNumber()
  version: number;

  @ApiProperty({ description: '创建时间' })
  @IsDate({ message: 'createdAt 格式不正确' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @IsDate({ message: 'updatedAt 格式不正确' })
  updatedAt: Date;
}
