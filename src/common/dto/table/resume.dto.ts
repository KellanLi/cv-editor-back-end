import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserTableDto } from './user.dto';
import { SectionTableDto } from './section.dto';

export class ResumeTableDto {
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

  @ApiProperty({
    type: () => UserTableDto,
    description: '用户信息',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserTableDto)
  user?: UserTableDto;

  @ApiProperty({
    type: () => [SectionTableDto],
    description: '简历模块',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionTableDto)
  sections?: SectionTableDto[];
}
