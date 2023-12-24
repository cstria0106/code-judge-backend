import {
  AmqpConnection,
  RabbitRPC,
  RabbitSubscribe,
} from '@golevelup/nestjs-rabbitmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Subject, throttleTime } from 'rxjs';
import { Readable } from 'stream';
import { match } from 'ts-pattern';
import typia from 'typia';

import { CompilerService } from '../compiler/compile.service';
import { JudgeService } from '../judge/judge.service';
import { Artifacts } from '../problem/artifacts';
import { ProblemService } from '../problem/problem.service';
import { Language } from '../problem/template';
import { StorageService } from '../storage/storage.service';
import { bigint } from '../util/bigint';
import { tryTypia } from '../util/try-typia';
import { SubmitStatus } from './status';
import { SubmitRepository } from './submit.repository';
import { SubmitService } from './submit.service';

export module StartProcess {
  export type Data = {
    submitId: string;
    inputId: keyof Artifacts['inputs'];
  };
}

export module Process {
  export type Data = {
    problemId: string;
    code: string;
    language: Language;
    inputId: keyof Artifacts['inputs'];
  };
}

export type SubmitResult = SubmitStatus & { debugText: string | null };

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

  private async processSubmit(
    submitId: string,
    data: {
      problemId: bigint;
      code: string;
      language: Language;
      inputId: string;
    },
    onStatusUpdate?: (status: SubmitStatus) => void,
  ): Promise<SubmitResult> {
    const { problem } = await this.problem.manageGet(data.problemId);

    // Get judge code
    const judgeCode = problem.templates.judge[data.language];
    if (judgeCode === undefined) {
      throw new BadRequestException(
        'Invalid language. This problem does not support the language.',
      );
    }

    const input = problem.artifacts.inputs[data.inputId];

    const compileResult = await this.compiler.enqueue(
      submitId,
      data.language,
      judgeCode,
      data.code,
      () => {
        onStatusUpdate?.(SubmitStatus.compiling());
      },
    );

    const result = await match(compileResult)
      .with({ type: 'SUCCESS' }, async ({ files }) => {
        const judgeResult = await this.judge.enqueue(
          submitId,
          data.language,
          files,
          // Empty if input is not defined
          input === null || input === undefined
            ? Readable.from([])
            : await this.storage.download(input),
          problem.timeLimit,
          problem.memoryLimit,
          () => {
            onStatusUpdate?.(SubmitStatus.running(0));
          },
          (progress) => {
            onStatusUpdate?.(SubmitStatus.running(progress));
          },
        );

        return match(judgeResult)
          .with({ type: 'SUCCESS' }, ({ memory, time, debugText }) => ({
            status: SubmitStatus.success(memory, time),
            debugText,
          }))
          .with({ type: 'FAILED' }, ({ reason }) => ({
            status: SubmitStatus.failed(reason),
          }))
          .exhaustive();
      })
      .with({ type: 'FAILED' }, async ({ message }) => ({
        status: SubmitStatus.compileError(message),
      }))
      .with({ type: 'NO_RESOURCE' }, async () => ({
        status: SubmitStatus.compileError('No resource'),
      }))
      .exhaustive();

    onStatusUpdate?.(result.status);
    return {
      ...result.status,
      debugText: 'debugText' in result ? result.debugText : null,
    };
  }

  // doJudge RPC wrapper
  @RabbitRPC({
    exchange: 'submitWorker.loadBalancer',
    routingKey: 'submitWorker.process',
    queue: 'submitWorker.process',
    queueOptions: {
      durable: true,
    },
    createQueueIfNotExists: true,
  })
  async process(rawData: unknown): Promise<SubmitResult> {
    const data = await tryTypia(async () =>
      typia.assert<Process.Data>(rawData),
    );

    return this.processSubmit(randomUUID(), {
      ...data,
      problemId: bigint(data.problemId),
    });
  }

  // Judge Pub/Sub
  // Start process submit
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
        typia.assert<StartProcess.Data>(rawData),
      );

      this.logger.log(`Starting to process submit (${data.submitId})`);

      const submit = await this.submits.findOneOrThrow({
        id: data.submitId,
        status: {
          typeIsNot: 'COMPLETE',
        },
      });

      await this.processSubmit(
        submit.id,
        {
          problemId: submit.problem.id,
          code: submit.code,
          language: submit.language,
          inputId: data.inputId,
        },
        (status) => {
          this.publishStatus(submit.id, status);
        },
      );
    } catch (e) {
      this.logger.error(e);
      return;
    }
  }
}
