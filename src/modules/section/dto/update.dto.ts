import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { InfoTemplateItemDto } from './info-template-item.dto';

export class UpdateDto {
  @ApiProperty({
    example: 1,
    description: '模块ID',
  })
  @IsNumber()
  sectionId: number;

  @ApiProperty({
    example: 'test',
    description: '模块名称',
  })
  @IsString()
  name: string;

  @ApiProperty({
    type: [InfoTemplateItemDto],
    description: '信息层列表',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InfoTemplateItemDto)
  infoTemplates: InfoTemplateItemDto[];
}
