import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { InfoDto } from './info.dto';
import { Type } from 'class-transformer';

// model Content {
//   id        Int     @id @default(autoincrement())
//   sectionId Int
//   section   Section @relation(fields: [sectionId], references: [id])
//   infos     Info[]
// }

export class ContentDto {
  @ApiProperty({
    example: 1,
    description: '内容ID',
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    example: 1,
    description: '模块ID',
  })
  @IsNumber()
  sectionId: number;

  @ApiProperty({
    type: () => [InfoDto],
    description: '信息层',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InfoDto)
  infos?: InfoDto[];
}
