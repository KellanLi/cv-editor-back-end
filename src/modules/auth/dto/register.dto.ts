import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
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

  @ApiProperty({
    example: '张三',
    description: '用户名',
  })
  @IsString({ message: '用户名必须是字符串' })
  name: string;
}
