import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import configLoader from './config/loader';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from './provider/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { GlobalJwtModule } from './provider/jwt/jwt.module';
import { ResumeModule } from './modules/resume/resume.module';
import { ContentTemplateModule } from './modules/content-template/content-template.module';
import { SectionModule } from './modules/section/section.module';
import { StorageModule } from './modules/storage/storage.module';
import { AiModule } from './modules/ai/ai.module';
import { ResumeUpdatesModule } from './provider/resume-updates/resume-updates.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
      load: [configLoader],
    }),
    UserModule,
    PrismaModule,
    AuthModule,
    GlobalJwtModule,
    ResumeModule,
    ContentTemplateModule,
    SectionModule,
    StorageModule,
    AiModule,
    ResumeUpdatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
