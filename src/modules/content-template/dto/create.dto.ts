import { ApiProperty } from '@nestjs/swagger';
import { InfoTemplateDto } from './info-template.dto';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDto {
  @ApiProperty({
    description: '模块名称',
    example: '教育经历',
    type: String,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: '模块类型',
    example: 'education',
    type: String,
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: '信息层列表',
    type: () => [InfoTemplateDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InfoTemplateDto)
  infoTemplates: InfoTemplateDto[];
}
