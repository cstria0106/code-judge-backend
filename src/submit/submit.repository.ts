import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import typia from 'typia';

import { PrismaService } from '../prisma/prisma.service';
import { Language } from '../problem/template';
import { ensure } from '../util/ensure';
import { SubmitStatus } from './status';

export module SubmitRepository {
  export type Criteria = {
    id?: string;
    userId?: string;
    problemId?: bigint;
    language?: Language;
    status?: {
      type?: SubmitStatus['type'];
      typeIsNot?: SubmitStatus['type'];
      result?: {
        type?: (SubmitStatus & { type: 'COMPLETE' })['result']['type'];
      };
    };
    idContains?: string;
  };

  export module findOne {
    export type Submit = {
      id: string;
      user: {
        id: string;
        name: string;
      };
      problem: {
        id: bigint;
        name: string;
        timeLimit: number;
        memoryLimit: bigint;
      };
      language: Language;
      status: SubmitStatus;
      createdAt: Date;
      code: string;
      debugText: string;
    };
  }

  export module findMany {
    export type Submit = {
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
    };
  }

  export module create {
    export type Data = {
      userId: string;
      problemId: bigint;
      language: Language;
      code: string;
      status: SubmitStatus;
    };

    export type Submit = {
      id: string;
    };
  }

  export module update {
    export type Data = {
      status?: SubmitStatus;
      time?: number;
      memory?: number;
      debugText?: string;
    };
  }
}

@Injectable()
export class SubmitRepository {
  constructor(private readonly prisma: PrismaService) {}

  private where(criteria: SubmitRepository.Criteria): Prisma.SubmitWhereInput {
    return {
      id: criteria.id,
      problemId: criteria.problemId,
      userId: criteria.userId,
      language: criteria.language,
      AND: [
        ...(criteria.status?.type !== undefined
          ? [
              {
                status: {
                  path: '$.type',
                  equals: criteria.status.type,
                },
              },
            ]
          : []),
        ...(criteria.status?.typeIsNot !== undefined
          ? [
              {
                status: {
                  path: '$.type',
                  not: criteria.status.typeIsNot,
                },
              },
            ]
          : []),
        ...(criteria.status?.result?.type !== undefined
          ? [
              {
                status: {
                  path: '$.result.type',
                  equals: criteria.status.result.type,
                },
              },
            ]
          : []),
      ],
      ...(criteria.idContains !== undefined
        ? {
            id: {
              contains: criteria.idContains,
            },
          }
        : undefined),
    };
  }

  async findOne(
    criteria: SubmitRepository.Criteria,
  ): Promise<SubmitRepository.findOne.Submit | null> {
    return this.prisma.submit
      .findFirst({
        where: this.where(criteria),
        select: {
          id: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          language: true,
          status: true,
          createdAt: true,
          problem: {
            select: {
              id: true,
              name: true,
              timeLimit: true,
              memoryLimit: true,
            },
          },
          code: true,
          debugText: true,
        },
      })
      .then((submit) =>
        submit !== null
          ? {
              ...submit,
              language: typia.assert<Language>(submit.language),
              status: typia.assert<SubmitStatus>(submit.status),
            }
          : submit,
      );
  }

  async findOneOrThrow(
    criteria: SubmitRepository.Criteria,
  ): Promise<SubmitRepository.findOne.Submit> {
    return this.findOne(criteria).then(ensure('Submit'));
  }

  async count(criteria: SubmitRepository.Criteria): Promise<number> {
    return this.prisma.submit.count({
      where: this.where(criteria),
    });
  }

  async findMany(
    criteria: SubmitRepository.Criteria,
    options: {
      take?: number;
      skip?: number;
    },
  ): Promise<SubmitRepository.findMany.Submit[]> {
    return this.prisma.submit
      .findMany({
        where: this.where(criteria),
        select: {
          id: true,
          user: { select: { id: true, name: true } },
          language: true,
          status: true,
          createdAt: true,
          problem: {
            select: { id: true, name: true },
          },
          debugText: true,
          code: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: options.skip,
        take: options.take,
      })
      .then((result) =>
        result.map((submit) => ({
          ...submit,
          language: typia.assert<Language>(submit.language),
          status: typia.assert<SubmitStatus>(submit.status),
        })),
      );
  }

  async create(
    data: SubmitRepository.create.Data,
  ): Promise<SubmitRepository.create.Submit> {
    return this.prisma.submit.create({
      data,
    });
  }

  async update(id: string, data: SubmitRepository.update.Data): Promise<void> {
    await this.prisma.submit.update({ where: { id }, data });
  }
}
