import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ResumeProfileTableDto {
  @ApiProperty({
    example: 1,
    description: '简历个人信息行 ID',
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    example: 1,
    description: '关联简历 ID',
  })
  @IsNumber()
  resumeId: number;

  @ApiProperty({ required: false, description: '证件照 URL' })
  @IsOptional()
  @IsString()
  photoUrl?: string | null;

  @ApiProperty({ required: false, description: '简历展示姓名' })
  @IsOptional()
  @IsString()
  fullName?: string | null;

  @ApiProperty({ required: false, example: '1990-01-15T00:00:00.000Z' })
  @IsOptional()
  @IsDate({ message: '出生日期格式不正确' })
  @Type(() => Date)
  birthDate?: Date | null;

  @ApiProperty({ required: false, description: '目标岗位' })
  @IsOptional()
  @IsString()
  targetPosition?: string | null;

  @ApiProperty({ required: false, description: '联系邮箱' })
  @IsOptional()
  @IsString()
  email?: string | null;

  @ApiProperty({ required: false, description: '联系电话' })
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiProperty({
    required: false,
    example: { wechat: 'wx_xxx' },
    description: '可扩展键值，约定值为字符串',
  })
  @IsOptional()
  profileExtra?: unknown;
}
