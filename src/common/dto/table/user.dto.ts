import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsDate,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ResumeDto } from './resume.dto';
import { Type } from 'class-transformer';

// model User {
//   id        Int      @id @default(autoincrement())
//   email     String   @unique
//   password  String
//   name      String?
//   gender    String?
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt
//   resumes   Resume[]
// }

export class UserDto {
  id: number;
  @ApiProperty({
    example: 'test@example.com',
    description: '用户邮箱',
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({
    example: 'password123',
    description: '用户密码',
  })
  @IsOptional()
  @IsString({ message: '密码必须是字符串' })
  password?: string;

  @ApiProperty({
    example: 'test',
    description: '用户名',
  })
  @IsOptional()
  @IsString({ message: '用户名必须是字符串' })
  name?: string;

  @ApiProperty({
    example: 'male',
    description: '用户性别',
  })
  @IsOptional()
  @IsString({ message: '用户性别必须是字符串' })
  gender?: string;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: '创建时间',
  })
  @IsDate({ message: '创建时间格式不正确' })
  createdAt: Date;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: '更新时间',
  })
  @IsDate({ message: '更新时间格式不正确' })
  updatedAt: Date;

  @ApiProperty({
    description: '简历列表',
    type: [ResumeDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeDto)
  resumes?: ResumeDto[];
}
