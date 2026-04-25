import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNumber, IsString } from 'class-validator';

export class AiGlobalContextTableDto {
  @ApiProperty({ example: 1, description: '记录 ID' })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 1, description: '简历 ID（同一份简历下多对话共享）' })
  @IsNumber()
  resumeId: number;

  @ApiProperty({ example: 'job_description', description: '键，如 JD' })
  @IsString()
  key: string;

  @ApiProperty({ example: '岗位职责…', description: '长文本' })
  @IsString()
  value: string;

  @ApiProperty({ description: '创建时间' })
  @IsDate({ message: '创建时间格式不正确' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @IsDate({ message: '更新时间格式不正确' })
  updatedAt: Date;
}
