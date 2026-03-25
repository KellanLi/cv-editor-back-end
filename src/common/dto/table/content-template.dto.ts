import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsDate,
  ValidateNested,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InfoTemplateTableDto } from './info-template.dto';
import { UserTableDto } from './user.dto';

export class ContentTemplateDtoTable {
  @ApiProperty({
    example: 1,
    description: '内容模板ID',
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    example: 1,
    description: '用户ID',
  })
  @IsNumber()
  userId: number;

  @ApiProperty({
    example: '基本信息',
    description: '内容模板名称',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'basic',
    description: '内容模板类型',
  })
  @IsString()
  type: string;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: '创建时间',
  })
  @IsDate({ message: '创建时间格式不正确' })
  createdAt: Date;

  @ApiProperty({
    type: () => [InfoTemplateTableDto],
    description: '信息层',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InfoTemplateTableDto)
  infoTemplates?: InfoTemplateTableDto[];

  @ApiProperty({
    example: 1,
    description: '用户信息',
    type: () => UserTableDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserTableDto)
  user?: UserTableDto;
}
