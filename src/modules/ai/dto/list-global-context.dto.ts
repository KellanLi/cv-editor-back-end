import { PaginationDto } from '@/common/dto/pagination.dto';
import { AiGlobalContextDto } from '@/common/dto/business/ai-global-context.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterAiGlobalContextDto {
  @ApiProperty({ description: '简历 ID' })
  @IsNumber()
  resumeId: number;
}

export class ListAiGlobalContextDto {
  @ApiProperty({ type: FilterAiGlobalContextDto, description: '过滤' })
  @ValidateNested()
  @Type(() => FilterAiGlobalContextDto)
  filter: FilterAiGlobalContextDto;

  @ApiProperty({ type: PaginationDto, description: '分页' })
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination: PaginationDto;
}

export class ListAiGlobalContextDataDto {
  @ApiProperty({ type: [AiGlobalContextDto], description: '全局上下文案列表' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiGlobalContextDto)
  list: AiGlobalContextDto[];

  @ApiProperty({ type: PaginationDto, description: '分页' })
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination: PaginationDto;
}
