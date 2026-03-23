import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { InfoTemplateItemDto } from './info-template-item.dto';

export class CreateDto {
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
