import { ApiProperty } from '@nestjs/swagger';
import { InfoTemplateDto } from './info-template.dto';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDto {
  @ApiProperty({
    example: 1,
    description: '模块ID',
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    example: 'test',
    description: '模块名称',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'test',
    description: '模块类型',
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
