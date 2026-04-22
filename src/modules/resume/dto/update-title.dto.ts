import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class UpdateResumeTitleDto {
  @ApiProperty({
    description: '简历ID',
    example: 1,
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: '简历名称（标题）',
    example: '校招-后端',
  })
  @IsString()
  title: string;
}
