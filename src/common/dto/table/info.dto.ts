import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ContentTableDto } from './content.dto';
import { Type } from 'class-transformer';

// model Info {
//   id        Int     @id @default(autoincrement())
//   contentId Int
//   type      String
//   values    Json
//   content   Content @relation(fields: [contentId], references: [id])
// }

export class InfoTableDto {
  @ApiProperty({
    example: 1,
    description: '信息ID',
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    example: 1,
    description: '内容ID',
  })
  @IsNumber()
  contentId: number;

  @ApiProperty({
    example: 'xxx',
    description: '信息层类型',
  })
  @IsString()
  type: string;

  @ApiProperty({
    example: ['value1', 'value2'],
    description: '信息值数组',
  })
  @IsArray()
  @IsString({ each: true })
  values: string[];

  @ApiProperty({
    type: () => ContentTableDto,
    description: '内容',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ContentTableDto)
  content?: ContentTableDto;
}
