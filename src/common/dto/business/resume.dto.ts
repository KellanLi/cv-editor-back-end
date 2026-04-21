import { ApiProperty, OmitType } from '@nestjs/swagger';
import { ResumeTableDto } from '@/common/dto/table/resume.dto';
import { SectionDto } from './section.dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/** 简历 API 响应：不含 `user`；可选嵌套 `sections` 为业务 {@link SectionDto}。 */
export class ResumeDto extends OmitType(ResumeTableDto, ['user', 'sections']) {
  @ApiProperty({
    type: () => [SectionDto],
    description: '模块',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections?: SectionDto[];
}
