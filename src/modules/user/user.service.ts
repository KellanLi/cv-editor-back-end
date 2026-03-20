import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  create(params: CreateUserDto) {
    return this.prismaService.user.create({
      data: params,
    });
  }

  async register(params: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(params.password, 10);
    return this.prismaService.user.create({
      data: {
        ...params,
        password: hashedPassword,
      },
    });
  }

  async login(params: LoginDto) {
    const { email, password } = params;

    const user = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });
    if (!user) {
      throw new Error('用户不存在');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('密码错误');
    }

    const token = this.jwtService.sign({ id: user.id });

    return { user, token };
  }
}
