import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtGuard } from '../../provider/jwt/jwt.guard';
import { Request } from '@/types/request.types';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('用户模块')
@Controller('user')
@UseGuards(JwtGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: '获取用户信息' })
  getProfile(@Req() req: Request) {
    return req.user;
  }
}
