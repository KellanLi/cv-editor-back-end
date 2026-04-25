import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNumber, IsOptional, IsString } from 'class-validator';

export class AiToolCallTableDto {
  @ApiProperty({ example: 1, description: '工具调用记录 ID' })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 1, description: '所属消息 ID' })
  @IsNumber()
  messageId: number;

  @ApiProperty({ required: false, description: '幂等键' })
  @IsOptional()
  @IsString()
  idempotencyKey: string | null;

  @ApiProperty({ example: 'get_resume_context', description: '工具名' })
  @IsString()
  name: string;

  @ApiProperty({ description: '入参（JSON，与存库一致）' })
  input: unknown;

  @ApiProperty({ example: 'success', description: '执行状态' })
  @IsString()
  status: string;

  @ApiProperty({ required: false, description: '输出（JSON）' })
  @IsOptional()
  output: unknown;

  @ApiProperty({ required: false, description: '错误信息' })
  @IsOptional()
  @IsString()
  error: string | null;

  @ApiProperty({ required: false, description: '提供方/框架侧 call id' })
  @IsOptional()
  @IsString()
  externalId: string | null;

  @ApiProperty({ required: false, description: '开始时间' })
  @IsOptional()
  @IsDate({ message: 'startedAt 格式不正确' })
  startedAt: Date | null;

  @ApiProperty({ required: false, description: '结束时间' })
  @IsOptional()
  @IsDate({ message: 'endedAt 格式不正确' })
  endedAt: Date | null;
}
