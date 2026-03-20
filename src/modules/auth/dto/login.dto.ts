import {
  IsDate,
  IsEmail,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class LoginDto {
  @ApiProperty({
    example: 'test@example.com',
    description: '用户邮箱',
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: '用户密码（至少6位）',
  })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码至少6位' })
  password: string;
}

export class UserDto {
  id: number;
  @ApiProperty({
    example: 'test@example.com',
    description: '用户邮箱',
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({
    example: 'test',
    description: '用户名',
  })
  @IsString({ message: '用户名必须是字符串' })
  name: string | null;

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
}

export class TokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'token值',
  })
  @IsString({ message: 'token必须是字符串' })
  value: string;

  @ApiProperty({
    example: 'Bearer',
    description: 'token类型',
  })
  @IsString({ message: 'token类型必须是字符串' })
  type: string;
}

export class LoginDataDto {
  @ApiProperty({
    type: UserDto,
    description: '用户信息',
  })
  @ValidateNested()
  @Type(() => UserDto)
  user: UserDto;

  @ApiProperty({
    type: TokenDto,
    description: 'token信息',
  })
  @ValidateNested()
  @Type(() => TokenDto)
  token: TokenDto;
}
