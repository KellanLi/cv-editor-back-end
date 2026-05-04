import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const JD_MAX_CHARS = 200_000;

export class CreateResumeDto {
  @ApiProperty({
    description: '简历标题',
    example: '我的简历',
    type: String,
  })
  @IsString()
  title: string;

  @ApiProperty({
    required: false,
    example: 'https://cdn.example.com/covers/1.png',
    description: '列表/卡片等场景用的封面图 URL',
  })
  @IsOptional()
  @IsString()
  listCoverImageUrl?: string;

  @ApiProperty({
    required: false,
    description:
      '职位描述（JD）全文；可选。创建后可用 resume/update-job-description 修改或清空',
  })
  @IsOptional()
  @IsString()
  @MaxLength(JD_MAX_CHARS)
  jobDescriptionText?: string;
}
