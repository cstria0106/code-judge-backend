import { S3Client } from '@aws-sdk/client-s3';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AwsSdkModule } from 'aws-sdk-v3-nest';

import { AppRabbitMQModule } from './app-rabbitmq.module';
import { AuthModule } from './auth/auth.module';
import { CompilerModule } from './compiler/compile.module';
import { CryptoModule } from './crypto/crypto.module';
import { HttpExceptionFilter } from './http-exception.filter';
import { JudgeModule } from './judge/judge.module';
import { JwtGuard } from './jwt/jwt.guard';
import { JwtModule } from './jwt/jwt.module';
import { PingModule } from './ping/ping.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProblemModule } from './problem/problem.module';
import { S3Module } from './s3/s3.module';
import { StorageModule } from './storage/storage.module';
import { SubmitModule } from './submit/submit.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppRabbitMQModule,
    S3Module,
    PrismaModule,
    UserModule,
    ProblemModule,
    SubmitModule,
    JudgeModule,
    CompilerModule,
    AuthModule,
    JwtModule,
    CryptoModule,
    PingModule,
    StorageModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: JwtGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
