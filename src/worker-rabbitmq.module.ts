import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          uri: config.getOrThrow<string>('RMQ_URI'),
          exchanges: [
            {
              name: 'submitWorker.loadBalancer',
              type: 'direct',
              createExchangeIfNotExists: true,
            },
            {
              name: 'pingWorker.broadcaster',
              type: 'direct',
              createExchangeIfNotExists: true,
            },
          ],
        };
      },
    }),
  ],
  exports: [RabbitMQModule],
})
export class WorkerRabbitMQModule {}
