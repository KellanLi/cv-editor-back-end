import { Body, Controller, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('用户模块')
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Post('create')
  create(@Body() body: CreateUserDto) {
    return this.userService.create(body);
  }

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  register(@Body() body: CreateUserDto) {
    return this.userService.create(body);
  }
}
