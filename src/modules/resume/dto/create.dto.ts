import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

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
}
