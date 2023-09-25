import { AmqpConnection, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { match } from 'ts-pattern';
import typia from 'typia';

import { CompilerService } from '../compiler/compile.service';
import { JudgeService } from '../judge/judge.service';
import { ProblemService } from '../problem/problem.service';
import { StorageService } from '../storage/storage.service';
import { tryTypia } from '../util/try-typia';
import { SubmitStatus } from './status';
import { SubmitRepository } from './submit.repository';
import { SubmitService } from './submit.service';

export module SubmitWorkerService {
  export module startProcess {
    export type Data = {
      submitId: string;
      inputId?: 'public' | 'hidden';
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
    private readonly storage: StorageService,

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

    // Get judge code
    const judgeCode = problem.templates.judge[submit.language];
    if (judgeCode === undefined) {
      throw new BadRequestException(
        'Invalid language. This problem does not support the language.',
      );
    }

    const input = problem.artifacts.inputs[data.inputId ?? 'public'];
    if (input === null) {
      throw new BadRequestException('Invalid input type.');
    }

    try {
      const compileResult = await this.compiler.enqueue(
        submit.id,
        submit.language,
        judgeCode,
        submit.code,
        async () => {
          await this.updateStatus(submit.id, SubmitStatus.compiling());
        },
      );

      match(compileResult)
        .with({ type: 'SUCCESS' }, async ({ files }) => {
          const judgeResult = await this.judge.enqueue(
            submit.id,
            submit.language,
            files,
            await this.storage.download(input),
            5000,
            async () => {
              await this.updateStatus(submit.id, SubmitStatus.running(0));
            },
            async (progress) => {
              await this.updateStatus(
                submit.id,
                SubmitStatus.running(progress),
              );
            },
          );

          await this.updateStatus(
            submit.id,
            match(judgeResult)
              .with({ type: 'SUCCESS' }, ({ memory, time }) =>
                SubmitStatus.success(memory, time),
              )
              .with({ type: 'FAILED' }, ({ reason }) =>
                SubmitStatus.failed(reason),
              )
              .exhaustive(),
          );
        })
        .with({ type: 'FAILED' }, async ({ message }) => {
          await this.updateStatus(
            submit.id,
            SubmitStatus.compileError(message),
          );
        })
        .with({ type: 'NO_RESOURCE' }, async () => {
          await this.updateStatus(
            submit.id,
            SubmitStatus.compileError('No resource'),
          );
        })
        .exhaustive();
    } catch (e) {
      await this.updateStatus(submit.id, SubmitStatus.unknownError());
    }
  }
}
