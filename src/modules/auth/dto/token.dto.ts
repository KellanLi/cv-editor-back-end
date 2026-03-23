import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'token值',
  })
  @IsString({ message: 'token必须是字符串' })
  value: string;

  @ApiProperty({
    example: 'Bearer',
    description: 'token类型',
  })
  @IsString({ message: 'token类型必须是字符串' })
  type: string;
}
