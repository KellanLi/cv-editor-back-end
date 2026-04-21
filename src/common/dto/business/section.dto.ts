import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SectionTableDto } from '@/common/dto/table/section.dto';
import { ContentDto } from './content.dto';

/** 模块 API 响应：不含 `resume` 嵌套；`contents` 使用业务 {@link ContentDto}。 */
export class SectionDto extends OmitType(SectionTableDto, [
  'resume',
  'contents',
]) {
  @ApiProperty({
    type: () => [ContentDto],
    description: '内容',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ContentDto)
  contents?: ContentDto[];
}
