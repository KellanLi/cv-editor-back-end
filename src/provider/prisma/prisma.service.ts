import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@/generated/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(configService: ConfigService) {
    const adapter = new PrismaMariaDb({
      host: configService.getOrThrow<string>('DATABASE_HOST'),
      user: configService.getOrThrow<string>('DATABASE_USER'),
      password: configService.getOrThrow<string>('DATABASE_PASSWORD'),
      database: configService.getOrThrow<string>('DATABASE_NAME'),
      port: configService.getOrThrow<number>('DATABASE_PORT'),
    });
    super({ adapter });
  }
  async onModuleInit() {
    await this.$connect();
  }
}
