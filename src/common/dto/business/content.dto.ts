import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ContentTableDto } from '@/common/dto/table/content.dto';
import { InfoDto } from './info.dto';

/** 内容 API 响应：`infos` 使用业务 {@link InfoDto}（无反向 `content` 嵌套）。 */
export class ContentDto extends OmitType(ContentTableDto, [
  'infos',
  'section',
]) {
  @ApiProperty({
    type: () => [InfoDto],
    description: '信息层',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InfoDto)
  infos?: InfoDto[];
}
