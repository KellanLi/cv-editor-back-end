import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SectionDto } from '@/common/dto/business/section.dto';

export class ReorderSectionItemDto {
  @ApiProperty({
    description: '模块ID',
    example: 1,
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: '同一简历内的展示顺序（升序）',
    example: 1,
  })
  @IsNumber()
  order: number;
}

export class ReorderSectionDto {
  @ApiProperty({
    description: '简历ID（限定只在该简历内批量调整顺序）',
    example: 1,
  })
  @IsNumber()
  resumeId: number;

  @ApiProperty({
    description: '需要调整顺序的模块列表（须全部属于该简历）',
    type: [ReorderSectionItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderSectionItemDto)
  items: ReorderSectionItemDto[];
}

export class ReorderSectionDataDto {
  @ApiProperty({
    description: '调整顺序后的模块列表（已按 order 升序）',
    type: [SectionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  list: SectionDto[];
}
