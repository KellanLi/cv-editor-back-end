/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@/generated/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private configService: ConfigService) {
    const adapter = new PrismaMariaDb({
      host: configService.getOrThrow('DATABASE_HOST'),
      user: configService.getOrThrow('DATABASE_USER'),
      password: configService.getOrThrow('DATABASE_PASSWORD'),
      database: configService.getOrThrow('DATABASE_NAME'),
      port: configService.getOrThrow('DATABASE_PORT'),
    });
    super({ adapter });
  }
  async onModuleInit() {
    await this.$connect();
  }
}
