import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 按简历 ID 更新 {@link ResumeProfile}；只传需要修改的字段。
 * 某字段为 `null` 时表示清空该字段；不传表示不修改。
 */
export class UpdateResumeProfileDto {
  @ApiProperty({
    description: '简历ID（非 ResumeProfile 主键）',
    example: 1,
  })
  @IsNumber()
  id: number;

  @ApiProperty({ required: false, description: '证件照 URL' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiProperty({ required: false, description: '简历展示姓名' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ required: false, example: '1990-01-15T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: '出生日期格式不正确' })
  birthDate?: Date;

  @ApiProperty({ required: false, description: '目标岗位' })
  @IsOptional()
  @IsString()
  targetPosition?: string;

  @ApiProperty({ required: false, description: '联系邮箱' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false, description: '联系电话' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    required: false,
    example: { wechat: 'wx_001' },
    description: '可扩展键值',
  })
  @IsOptional()
  @IsObject()
  profileExtra?: string[];
}
