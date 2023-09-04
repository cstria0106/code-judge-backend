import { AmqpConnection, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { setTimeout } from 'timers/promises';
import typia from 'typia';

import { tryTypia } from '../util/try-typia';

export module PingService {
  export module registerWorker {
    export type Data = {
      id: string;
    };
  }
}

@Injectable()
export class PingService implements OnModuleInit {
  private readonly logger: Logger = new Logger(PingService.name);

  constructor(private readonly amqp: AmqpConnection) {}

  private readonly workers: Record<string, { lastPing: Date }> = {};

  async onModuleInit() {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  private async pingToWorkers() {
    await this.amqp.publish('pingWorker.broadcaster', 'pingWorker.ping', {});

    await setTimeout(1000);

    const now = Date.now();
    for (const id in this.workers) {
      const worker = this.workers[id];

      if (now - worker.lastPing.valueOf() > 1000 * 15) {
        delete this.workers[id];
      }
    }

    this.logger.log(`${Object.keys(this.workers).length} workers alive`);
  }

  @RabbitSubscribe({
    exchange: 'ping.broadcaster',
    routingKey: 'ping.registerWorker',
    queueOptions: {
      autoDelete: true,
      durable: false,
    },
  })
  async registerWorker(rawData: unknown) {
    const data = await tryTypia(async () =>
      typia.assert<PingService.registerWorker.Data>(rawData),
    );

    this.workers[data.id] = {
      lastPing: new Date(),
    };
  }
}
