import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CreateSectionDto {
  @ApiProperty({
    description: '简历ID',
    example: 1,
  })
  @IsNumber()
  resumeId: number;

  @ApiProperty({
    description: '内容模板ID（决定该模块下的信息层结构）',
    example: 1,
  })
  @IsNumber()
  contentTemplateId: number;
}
