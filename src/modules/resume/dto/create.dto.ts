import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateResumeDto {
  @ApiProperty({
    description: '简历标题',
    example: '我的简历',
    type: String,
  })
  @IsString()
  title: string;
}
