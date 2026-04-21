import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNumber, IsString } from 'class-validator';

/** 与 {@link ResumeTableDto} 标量字段一致；独立定义以避免与 Section 表 DTO 循环引用导致类型退化为 error。 */
export class ResumeDto {
  @ApiProperty({
    example: 1,
    description: '简历ID',
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    example: 1,
    description: '用户ID',
  })
  @IsNumber()
  userId: number;

  @ApiProperty({
    example: '我的简历',
    description: '简历标题',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: '创建时间',
  })
  @IsDate({ message: '创建时间格式不正确' })
  createdAt: Date;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: '更新时间',
  })
  @IsDate({ message: '更新时间格式不正确' })
  updatedAt: Date;
}
