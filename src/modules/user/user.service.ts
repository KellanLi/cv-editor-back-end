import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(private prismaService: PrismaService) {}

  create(params: CreateUserDto) {
    return this.prismaService.user.create({
      data: params,
    });
  }
}
