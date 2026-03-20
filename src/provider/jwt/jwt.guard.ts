import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from '@/types/request.types';
import { JwtPayload } from '@/types/auth.types';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('未登录');
    }

    const token = authHeader.split(' ')[1];

    try {
      const user = this.jwtService.verify<JwtPayload>(token);
      request.user = user;
      return true;
    } catch (e: unknown) {
      console.error(e);
      throw new UnauthorizedException('token 无效');
    }
  }
}
