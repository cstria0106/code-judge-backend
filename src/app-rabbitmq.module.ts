import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageModule } from './storage/storage.module';

@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          uri: config.getOrThrow<string>('RMQ_URI'),
          exchanges: [
            {
              name: 'submit.broadcaster',
              type: 'direct',
              createExchangeIfNotExists: true,
            },
            {
              name: 'ping.broadcaster',
              type: 'direct',
              createExchangeIfNotExists: true,
            },
          ],
        };
      },
    }),
    StorageModule,
  ],
  exports: [RabbitMQModule],
})
export class AppRabbitMQModule {}
