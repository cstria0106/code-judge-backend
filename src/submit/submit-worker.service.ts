import { AmqpConnection, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Subject, throttleTime } from 'rxjs';
import { Readable } from 'stream';
import { match } from 'ts-pattern';
import typia from 'typia';

import { CompilerService } from '../compiler/compile.service';
import { JudgeService } from '../judge/judge.service';
import { Artifacts } from '../problem/artifacts';
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
      inputId: keyof Artifacts['inputs'];
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

  /** Status update buffer for throttling */
  private statusUpdates: Record<string, Subject<SubmitStatus>> = {};

  // Start to subscribe submit status subject, and send republish the data to message queue
  private startSubscribe(submitId: string, subject: Subject<SubmitStatus>) {
    subject
      .pipe(throttleTime(250, undefined, { leading: true, trailing: true }))
      .subscribe(async (status) => {
        this.submits.update(submitId, {
          status,
          ...(status.type === 'COMPLETE' && status.result.type === 'SUCCESS'
            ? {
                time: status.result.time,
                memory: status.result.memory,
              }
            : undefined),
        });

        this.amqp.publish('submit.broadcaster', 'submit.publishChangeEvent', {
          submitId,
          status,
        } satisfies SubmitService.publishChangeEvent.Data);
      });
  }

  // Publish submit status to subject
  private publishStatus(submitId: string, status: SubmitStatus) {
    // Create and start subscribe subject if not exists
    if (!(submitId in this.statusUpdates)) {
      const subject = new Subject<SubmitStatus>();
      this.statusUpdates[submitId] = subject;
      this.startSubscribe(submitId, subject);
    }

    // Publish to subject
    const subject = this.statusUpdates[submitId];
    subject.next(status);

    // Complete and delete subject if status is complete
    if (status.type === 'COMPLETE') {
      subject.complete();
      delete this.statusUpdates[submitId];
    }
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
    try {
      const data = await tryTypia(async () =>
        typia.assert<SubmitWorkerService.startProcess.Data>(rawData),
      );

      this.logger.log(`Starting to process submit (${data.submitId})`);

      const submit = await this.submits.findOneOrThrow({
        id: data.submitId,
        status: {
          typeIsNot: 'COMPLETE',
        },
      });

      try {
        const { problem } = await this.problem.manageGet(submit.problem.id);

        // Get judge code
        const judgeCode = problem.templates.judge[submit.language];
        if (judgeCode === undefined) {
          throw new BadRequestException(
            'Invalid language. This problem does not support the language.',
          );
        }

        const input = problem.artifacts.inputs[data.inputId ?? 'public'];

        const compileResult = await this.compiler.enqueue(
          submit.id,
          submit.language,
          judgeCode,
          submit.code,
          async () => {
            this.publishStatus(submit.id, SubmitStatus.compiling());
          },
        );

        match(compileResult)
          .with({ type: 'SUCCESS' }, async ({ files }) => {
            const judgeResult = await this.judge.enqueue(
              submit.id,
              submit.language,
              files,
              // Empty if input is not defined
              input === null || input === undefined
                ? Readable.from([])
                : await this.storage.download(input),
              submit.problem.timeLimit,
              submit.problem.memoryLimit,
              () => {
                this.publishStatus(submit.id, SubmitStatus.running(0));
              },
              (progress) => {
                this.publishStatus(submit.id, SubmitStatus.running(progress));
              },
            );

            // Update debug text
            await this.submits.update(submit.id, {
              debugText: judgeResult.debugText,
            });

            // Update status
            this.publishStatus(
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
            this.publishStatus(submit.id, SubmitStatus.compileError(message));
          })
          .with({ type: 'NO_RESOURCE' }, async () => {
            this.publishStatus(
              submit.id,
              SubmitStatus.compileError('No resource'),
            );
          })
          .exhaustive();
      } catch (e) {
        this.logger.error(e);
        this.publishStatus(submit.id, SubmitStatus.unknownError());
      }
    } catch (e) {
      this.logger.error(e);
      return;
    }
  }
}
