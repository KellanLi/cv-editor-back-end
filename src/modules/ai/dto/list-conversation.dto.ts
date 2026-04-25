import { PaginationDto } from '@/common/dto/pagination.dto';
import { AiConversationDto } from '@/common/dto/business/ai-conversation.dto';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiConversationPurpose } from '@/generated/enums';

export class FilterAiConversationDto {
  @ApiProperty({ description: '简历 ID' })
  @IsNumber()
  resumeId: number;

  @ApiProperty({ required: false, description: '业务状态' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    required: false,
    description: '用途',
    enum: Object.values(AiConversationPurpose),
  })
  @IsOptional()
  @IsIn(Object.values(AiConversationPurpose))
  purpose?: AiConversationPurpose;
}

export class ListAiConversationDto {
  @ApiProperty({ type: FilterAiConversationDto, description: '过滤条件' })
  @ValidateNested()
  @Type(() => FilterAiConversationDto)
  filter: FilterAiConversationDto;

  @ApiProperty({ type: PaginationDto, description: '分页' })
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination: PaginationDto;
}

export class ListAiConversationDataDto {
  @ApiProperty({
    type: [AiConversationDto],
    description: '当前页对话线程（默认不含消息列表，仅元数据）',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiConversationDto)
  list: AiConversationDto[];

  @ApiProperty({ type: PaginationDto, description: '分页' })
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination: PaginationDto;
}
