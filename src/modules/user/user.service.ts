import { PrismaService } from '@/provider/prisma/prisma.service';
import { IJwtPayload } from '@/types/auth.types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(private prismaService: PrismaService) {}

  async detail(jwt: IJwtPayload) {
    const { id } = jwt;
    const { password, ...rest } =
      await this.prismaService.user.findUniqueOrThrow({
        where: {
          id,
        },
      });

    return rest;
  }
}
