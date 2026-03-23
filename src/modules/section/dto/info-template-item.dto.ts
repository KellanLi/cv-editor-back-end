import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class InfoTemplateItemDto {
  @ApiProperty({
    example: 'text',
    description: '信息层类型',
  })
  @IsString()
  type: string;

  @ApiProperty({
    example: ['info1', 'info2'],
    description: '信息层名称列表',
  })
  names: string[];

  @ApiProperty({
    example: 1,
    description: '排序顺序',
  })
  @IsNumber()
  order: number;
}
