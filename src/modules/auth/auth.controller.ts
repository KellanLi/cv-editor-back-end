import { Controller, Body, Post } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ApiResponseWrapper } from '@/common/decorators/api-response-wrapper.decorator';
import { LoginDataDto } from './dto/login.dto';
import { UserDto } from './dto/user.dto';

@ApiTags('认证模块')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  @ApiBody({ type: RegisterDto })
  @ApiResponseWrapper(UserDto)
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  @ApiBody({ type: LoginDto })
  @ApiResponseWrapper(LoginDataDto)
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }
}
