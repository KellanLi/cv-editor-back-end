import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class BaseResponseDto<T> {
  @ApiProperty({
    description: '状态码',
    example: 0,
  })
  @IsNumber()
  code: number;

  @ApiProperty({
    description: '返回信息',
    example: 'success',
  })
  @IsString()
  message: string;

  data: T;
}
