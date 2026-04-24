import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/** `listCoverImageUrl` 必须出现在 body 中：可为 `null`（清空）或 URL 字符串。 */
@ValidatorConstraint({ name: 'resumeListCoverOrNull', async: false })
class IsListCoverImageOrNullInBody implements ValidatorConstraintInterface {
  validate(v: unknown) {
    if (v === null) {
      return true;
    }
    if (typeof v === 'string') {
      return true;
    }
    return false;
  }
}

export class UpdateResumeListCoverDto {
  @ApiProperty({ description: '简历ID', example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({
    required: true,
    nullable: true,
    example: 'https://cdn.example.com/covers/1.png',
    description: '列表封面图 URL；传 `null` 表示清空；须与 id 同传',
  })
  @Validate(IsListCoverImageOrNullInBody)
  listCoverImageUrl: string | null;
}
