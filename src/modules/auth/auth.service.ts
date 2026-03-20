import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/provider/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}
  async register(params: RegisterDto) {
    const { email, password } = params;

    const exist = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });

    if (exist) {
      throw new Error('用户已存在');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { password: _, ...user } = await this.prismaService.user.create({
      data: {
        ...params,
        password: hashedPassword,
      },
    });

    return user;
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

    const token = this.jwtService.sign({ id: user.id, email });

    const { password: _, ...rest } = user;

    return {
      user: rest,
      token: {
        value: token,
        type: 'Bearer',
      },
    };
  }
}
