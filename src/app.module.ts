import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from './provider/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { GlobalJwtModule } from './provider/jwt/jwt.module';
import { ResumeModule } from './modules/resume/resume.module';
import { ContentTemplateModule } from './modules/content-template/content-template.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
    }),
    UserModule,
    PrismaModule,
    AuthModule,
    GlobalJwtModule,
    ResumeModule,
    ContentTemplateModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
