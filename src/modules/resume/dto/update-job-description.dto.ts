import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const JD_MAX_CHARS = 200_000;

@ValidatorConstraint({ name: 'resumeJobDescriptionTextOrNull', async: false })
class IsJobDescriptionTextOrNullInBody implements ValidatorConstraintInterface {
  validate(v: unknown) {
    if (v === null) {
      return true;
    }
    if (typeof v === 'string') {
      return v.length <= JD_MAX_CHARS;
    }
    return false;
  }

  defaultMessage() {
    return `jobDescriptionText 须为字符串或 null；字符串长度不超过 ${String(JD_MAX_CHARS)}`;
  }
}

export class UpdateResumeJobDescriptionDto {
  @ApiProperty({ description: '简历ID', example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({
    required: true,
    nullable: true,
    description:
      'JD 全文；传 `null` 清空。须与 id 同传。最大长度约 20 万字符（与接口校验一致）。',
  })
  @Validate(IsJobDescriptionTextOrNullInBody)
  jobDescriptionText: string | null;
}
