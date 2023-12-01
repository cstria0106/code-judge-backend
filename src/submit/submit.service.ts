import { AmqpConnection, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Observable, Subject, finalize, map, merge, of, takeWhile } from 'rxjs';
import typia from 'typia';

import { Artifacts } from '../problem/artifacts';
import { ProblemService } from '../problem/problem.service';
import { Language } from '../problem/template';
import { UserRepository } from '../user/user.repository';
import { tryTypia } from '../util/try-typia';
import { SubmitStatus } from './status';
import { SubmitWorkerService } from './submit-worker.service';
import { SubmitRepository } from './submit.repository';

export module SubmitService {
  export module get {
    export type Result = {
      submit: {
        id: string;
        problem: {
          id: bigint;
          name: string;
        };
        language: Language;
        status: SubmitStatus;
        createdAt: Date;
      };
    };
  }

  export module list {
    export type Result = {
      submits: {
        id: string;
        problem: {
          id: bigint;
          name: string;
        };
        language: Language;
        status: SubmitStatus;
        createdAt: Date;
      }[];
      count: number;
    };
  }

  export module manageList {
    export type Result = {
      submits: {
        id: string;
        user: {
          id: string;
          name: string;
        };
        problem: {
          id: bigint;
          name: string;
        };
        language: Language;
        status: SubmitStatus;
        createdAt: Date;
        debugText: string;
        code: string;
      }[];
      count: number;
    };
  }

  export module subscribe {
    export type Options = {
      id?: string;
      skip?: number;
      take?: number;
    };

    export type InitialEvent = {
      type: 'initial';
      submits: {
        id: string;
        problem: {
          id: bigint;
          name: string;
        };
        language: Language;
        status: SubmitStatus;
        createdAt: Date;
      }[];
      count: number;
    };

    export type DetailEvent = {
      type: 'detail';
      submit: {
        id: string;
        problem: {
          id: bigint;
          name: string;
        };
        language: Language;
        status: SubmitStatus;
        createdAt: Date;
        code: string;
      };
    };

    export type UpdateEvent = {
      type: 'update';
      submit: {
        id: string;
        status: SubmitStatus;
      };
    };

    export type Event = InitialEvent | UpdateEvent | DetailEvent;
  }

  export module create {
    export type Data = {
      userId: string;
      problemId: bigint;
      language: Language;
      code: string;
    };

    export type Result = {
      submit: {
        id: string;
      };
    };
  }

  export module publishChangeEvent {
    export type Data = {
      submitId: string;
      status: SubmitStatus;
    };
  }
}

@Injectable()
export class SubmitService {
  private readonly logger: Logger = new Logger(SubmitService.name);

  private readonly updates: Record<
    string,
    Subject<SubmitService.subscribe.UpdateEvent['submit']>
  > = {};

  constructor(
    private readonly submits: SubmitRepository,
    private readonly problem: ProblemService,
    private readonly users: UserRepository,

    private readonly amqp: AmqpConnection,
  ) {}

  async list(
    userId: string,
    options: {
      skip?: number;
      take?: 20;
      userId?: string;
    },
  ): Promise<SubmitService.list.Result> {
    const submits = await this.submits.findMany(
      { userId },
      {
        skip: options.skip,
        take: options.take ?? 20,
      },
    );

    const count = await this.submits.count({ userId });
    return { submits, count };
  }

  async get(id: string) {
    return this.submits.findOneOrThrow({ id });
  }

  async manageList(options: {
    search?: {
      id?: string;
    };
    userId?: string;
    problemId?: bigint;
    language?: Language;
    status?: {
      type?: SubmitStatus['type'];
      result?: {
        type?: (SubmitStatus & { type: 'COMPLETE' })['result']['type'];
      };
    };
    skip?: number;
    take?: number;
  }): Promise<SubmitService.manageList.Result> {
    const criteria = {
      userId: options.userId,
      problemId: options.problemId,
      status: options.status,
      language: options.language,
      ...(options.search?.id && { idContains: options.search.id }),
    };
    const submits = await this.submits.findMany(criteria, {
      skip: options.skip,
      take: options.take ?? 50,
    });
    const count = await this.submits.count(criteria);
    return { submits, count };
  }

  async subscribe(
    userId: string,
    options: SubmitService.subscribe.Options,
  ): Promise<Observable<SubmitService.subscribe.Event>> {
    const initialOrDetail = options.id
      ? ({
          type: 'detail',
          submit: await this.submits.findOneOrThrow({
            userId,
            id: options.id,
          }),
        } as const)
      : ({
          type: 'initial',
          submits: await this.submits.findMany(
            { userId },
            {
              skip: options.skip,
              take: options.take ?? 20,
            },
          ),
          count: await this.submits.count({ userId }),
        } as const);

    const incompleteSubmits = (
      initialOrDetail.type === 'detail'
        ? [initialOrDetail.submit]
        : initialOrDetail.submits
    ).filter((submits) => submits.status.type !== 'COMPLETE');

    const submitIdsToSubscribe = incompleteSubmits.map((submit) => submit.id);

    const updates = merge(
      ...submitIdsToSubscribe.map((id) => {
        let subject = this.updates[id];
        if (subject === undefined) {
          subject = new Subject<
            SubmitService.subscribe.UpdateEvent['submit']
          >();

          this.updates[id] = subject;
        }

        return subject.pipe(
          // take while incomplete
          takeWhile((event) => event.status.type !== 'COMPLETE', true),
          // unsubscribe when complete
          finalize(() => {
            const exists = this.updates[id] !== undefined;
            if (exists) delete this.updates[id];
          }),
        );
      }),
    ).pipe(
      map((e) => ({
        type: 'update' as const,
        submit: e,
      })),
    );

    return merge(of(initialOrDetail), updates);
  }

  async create(
    data: SubmitService.create.Data,
  ): Promise<SubmitService.create.Result> {
    const { problem } = await this.problem.manageGet(data.problemId);

    // Check date and permission
    if (
      problem.startTime === null ||
      Date.now() < problem.startTime.valueOf()
    ) {
      const role = await this.users
        .findOneOrThrow({ id: data.userId })
        .then((user) => user.role);
      if (role !== 'ADMIN') {
        throw new NotFoundException('Problem not found');
      }
    }

    // Check judge code and input
    const judgeCode = problem.templates.judge[data.language];
    if (judgeCode === undefined) {
      throw new BadRequestException(
        'Invalid language. This problem does not support the language.',
      );
    }

    // Create submit
    const submit = await this.submits.create({
      ...data,
      problemId: problem.id,
      status: {
        type: 'WAITING',
      },
    });

    // Start judge
    await this.startJudge(submit.id, 'public');

    return { submit };
  }

  async startJudge(submitId: string, inputId: keyof Artifacts['inputs']) {
    await this.amqp.publish(
      'submitWorker.loadBalancer',
      'submitWorker.startProcess',
      { submitId, inputId } satisfies SubmitWorkerService.startProcess.Data,
    );
  }

  // Set all incomplete submits to be complete (unknown error)
  async clean() {
    const submits = await this.submits.findMany(
      { status: { typeIsNot: 'COMPLETE' } },
      {},
    );

    for (const submit of submits) {
      await this.submits.update(submit.id, {
        status: { type: 'COMPLETE', result: { type: 'UNKNOWN_ERROR' } },
      });
    }

    this.logger.log(
      `${submits.length} submit(s) has changed into complete (unknown error)`,
    );
  }

  @RabbitSubscribe({
    exchange: 'submit.broadcaster',
    routingKey: 'submit.publishChangeEvent',
    queueOptions: {
      autoDelete: true,
      durable: false,
    },
    createQueueIfNotExists: true,
  })
  async publishChangeEvent(rawData: unknown) {
    const data = await tryTypia(async () =>
      typia.assert<SubmitService.publishChangeEvent.Data>(rawData),
    );

    const subject = this.updates[data.submitId];

    if (subject !== undefined) {
      subject.next({
        id: data.submitId,
        status: data.status,
      });
    }
  }
}
