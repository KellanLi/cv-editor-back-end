import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from '@/types/request.types';

export const JwtPayload = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();

    return request.jwtPayload;
  },
);
