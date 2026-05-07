import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class DiagnoseResumeDto {
  @ApiProperty({ description: '简历 ID' })
  @IsNumber()
  @Type(() => Number)
  resumeId: number;

  @ApiProperty({
    required: false,
    description:
      '无 JD 时用于联网检索或推断的岗位方向；可空，将使用简历档案中的目标岗位或简历标题',
  })
  @IsOptional()
  @IsString()
  targetRole?: string;

  @ApiProperty({
    required: false,
    default: false,
    description:
      '是否在无 JD 时尝试用 Tavily 检索岗位信息以生成参考 JD（需服务端 TAVILY_API_KEY）',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  enableWebSearch?: boolean;
}
