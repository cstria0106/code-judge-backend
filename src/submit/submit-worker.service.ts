import { AmqpConnection, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Mutex } from 'async-mutex';
import typia from 'typia';

import { CompilerService } from '../compiler/compile.service';
import { JudgeService } from '../judge/judge.service';
import { ProblemService } from '../problem/problem.service';
import { tryTypia } from '../util/try-typia';
import { SubmitStatus } from './status';
import { SubmitRepository } from './submit.repository';
import { SubmitService } from './submit.service';

export module SubmitWorkerService {
  export module startProcess {
    export type Data = {
      submitId: string;
    };
  }
}

@Injectable()
export class SubmitWorkerService {
  private readonly logger: Logger = new Logger(SubmitWorkerService.name);

  constructor(
    private readonly submits: SubmitRepository,
    private readonly compiler: CompilerService,
    private readonly judge: JudgeService,
    private readonly problem: ProblemService,

    private readonly amqp: AmqpConnection,
  ) {}

  private async updateStatus(submitId: string, status: SubmitStatus) {
    await this.submits.update(submitId, {
      status,
      ...(status.type === 'COMPLETE' && status.result.type === 'SUCCESS'
        ? {
            time: status.result.time,
            memory: status.result.memory,
          }
        : undefined),
    });

    await this.amqp.publish('submit.broadcaster', 'submit.publishChangeEvent', {
      submitId,
      status,
    } satisfies SubmitService.publishChangeEvent.Data);
  }

  @RabbitSubscribe({
    exchange: 'submitWorker.loadBalancer',
    routingKey: 'submitWorker.startProcess',
    queue: 'submitWorker.startProcess',
    queueOptions: {
      durable: true,
    },
    createQueueIfNotExists: true,
  })
  async startProcess(rawData: unknown) {
    const data = await tryTypia(async () =>
      typia.assert<SubmitWorkerService.startProcess.Data>(rawData),
    );

    this.logger.log(`Starting to process submit (${data.submitId})`);

    const submit = await this.submits.findOneOrThrow({
      id: data.submitId,
      onlyIncomplete: true,
    });

    const { problem } = await this.problem.manageGet(submit.problem.id);

    const judgeCode = problem.templates.judge[submit.language];
    if (judgeCode === undefined)
      throw new BadRequestException(
        'Invalid language. This problem does not support the language.',
      );

    const mutex = new Mutex();

    this.compiler.enqueue(
      submit.id,
      submit.language,
      judgeCode,
      submit.code,
      // Compile started
      async () => {
        await mutex.runExclusive(async () => {
          await this.updateStatus(submit.id, {
            type: 'COMPILING',
          });
        });
      },
      // Compile complete
      async (result) => {
        await mutex.runExclusive(async () => {
          if (result.type === 'SUCCESS') {
            this.judge.enqueue(
              submit.id,
              submit.language,
              result.files,
              Buffer.from(problem.artifacts.inputs.public, 'base64'),
              5000,
              async () => {
                await mutex.runExclusive(async () => {
                  await this.updateStatus(submit.id, {
                    type: 'RUNNING',
                    progress: 0,
                  });
                });
              },
              async (progress) => {
                await mutex.runExclusive(async () => {
                  await this.updateStatus(submit.id, {
                    type: 'RUNNING',
                    progress,
                  });
                });
              },
              async (result) => {
                await mutex.runExclusive(async () => {
                  if (result.type === 'SUCCESS') {
                    await this.updateStatus(submit.id, {
                      type: 'COMPLETE',
                      result: {
                        type: 'SUCCESS',
                        time: result.time,
                        memory: result.memory,
                      },
                    });
                  } else if (result.type === 'FAILED') {
                    await this.updateStatus(submit.id, {
                      type: 'COMPLETE',
                      result: { type: 'FAILED', reason: result.reason },
                    });
                  }
                });
              },
              async () => {
                await mutex.runExclusive(async () => {
                  await this.updateStatus(submit.id, {
                    type: 'COMPLETE',
                    result: { type: 'UNKNOWN_ERROR' },
                  });
                });
              },
            );
          } else if (result.type === 'FAILED') {
            await this.updateStatus(submit.id, {
              type: 'COMPLETE',
              result: { type: 'COMPILE_ERROR', message: result.message },
            });
          } else if (result.type === 'NO_RESOURCE') {
            await this.updateStatus(submit.id, {
              type: 'COMPLETE',
              result: { type: 'COMPILE_ERROR', message: 'No resource' },
            });
          }
        });
      },
      // Code error
      async () => {
        await mutex.runExclusive(async () => {
          await this.updateStatus(submit.id, {
            type: 'COMPLETE',
            result: { type: 'UNKNOWN_ERROR' },
          });
        });
      },
    );
  }
}
