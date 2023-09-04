import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { PingWorkerModule } from './ping/ping-worker.module';
import { PrismaModule } from './prisma/prisma.module';
import { SubmitWorkerModule } from './submit/submit-worker.module';
import { WorkerRabbitMQModule } from './worker-rabbitmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WorkerRabbitMQModule,
    PrismaModule,
    SubmitWorkerModule,
    PingWorkerModule,
  ],
  controllers: [],
})
export class WorkerModule {}
