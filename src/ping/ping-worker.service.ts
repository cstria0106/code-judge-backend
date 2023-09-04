import { AmqpConnection, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PingService } from './ping.service';

@Injectable()
export class PingWorkerService {
  private readonly id: string;

  constructor(private readonly amqp: AmqpConnection) {
    this.id = randomUUID();
  }

  @RabbitSubscribe({
    exchange: 'pingWorker.broadcaster',
    routingKey: 'pingWorker.ping',
    queueOptions: {
      autoDelete: true,
      durable: false,
    },
  })
  async ping() {
    await this.amqp.publish('ping.broadcaster', 'ping.registerWorker', {
      id: this.id,
    } satisfies PingService.registerWorker.Data);
  }
}
