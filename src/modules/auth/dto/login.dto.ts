import { IsEmail, IsString, MinLength, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserDto } from './user.dto';
import { TokenDto } from './token.dto';

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
