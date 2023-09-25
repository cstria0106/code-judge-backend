import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PingWorkerModule } from './ping/ping-worker.module';
import { PrismaModule } from './prisma/prisma.module';
import { S3Module } from './s3/s3.module';
import { SubmitWorkerModule } from './submit/submit-worker.module';
import { WorkerRabbitMQModule } from './worker-rabbitmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WorkerRabbitMQModule,
    S3Module,
    PrismaModule,
    SubmitWorkerModule,
    PingWorkerModule,
  ],
  controllers: [],
})
export class WorkerModule {}
