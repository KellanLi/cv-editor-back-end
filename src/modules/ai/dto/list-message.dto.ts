import { PaginationDto } from '@/common/dto/pagination.dto';
import { AiMessageDto } from '@/common/dto/business/ai-message.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterAiMessageDto {
  @ApiProperty({ description: '对话线程 ID' })
  @IsNumber()
  conversationId: number;
}

export class ListAiMessageDto {
  @ApiProperty({ type: FilterAiMessageDto, description: '过滤' })
  @ValidateNested()
  @Type(() => FilterAiMessageDto)
  filter: FilterAiMessageDto;

  @ApiProperty({ type: PaginationDto, description: '分页' })
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination: PaginationDto;
}

export class ListAiMessageDataDto {
  @ApiProperty({ type: [AiMessageDto], description: '消息按 seq 或时间升序' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiMessageDto)
  list: AiMessageDto[];

  @ApiProperty({ type: PaginationDto, description: '分页' })
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination: PaginationDto;
}
