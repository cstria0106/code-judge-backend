import { Injectable } from '@nestjs/common';
import typia from 'typia';

import { PrismaService } from '../prisma/prisma.service';
import { ensure } from '../util/ensure';
import { Artifacts } from './artifacts';
import { Templates } from './template';

export namespace ProblemRepository {
  export type Criteria = {
    id?: bigint;
    startTimeIsBefore?: Date;
    endTimeIsNullOrAfter?: Date;
  };

  export namespace findMany {
    export type Options = {
      cursor?: {
        id: bigint;
      };
      take?: number;
    };

    export type Problem = {
      id: bigint;
      name: string;
      startTime: Date | null;
      endTime: Date | null;
      timeLimit: number;
      memoryLimit: bigint;
    };
  }

  export namespace findOne {
    export type Problem = {
      id: bigint;
      name: string;
      description: string;
      startTime: Date | null;
      endTime: Date | null;
      templates: Templates;
      artifacts: Artifacts;
      timeLimit: number;
      memoryLimit: bigint;
    };
  }

  export namespace findOneWithArtifacts {
    export type Problem = {
      id: bigint;
      name: string;
      description: string;
      startTime: Date | null;
      endTime: Date | null;
      artifacts: Artifacts;
      templates: Templates;
    };
  }

  export namespace create {
    export type Data = {
      name: string;
      description: string;
      artifacts: Artifacts;
      templates: Templates;
    };

    export type Problem = { id: bigint };
  }

  export namespace update {
    export type Data = {
      name?: string;
      description?: string;
      artifacts?: Artifacts;
      templates?: Templates;
      timeLimit?: number;
      memoryLimit?: bigint;
    };
  }
}

@Injectable()
export class ProblemRepository {
  constructor(private readonly prisma: PrismaService) {}

  where(criteria: ProblemRepository.Criteria) {
    return {
      id: criteria.id,
      ...(criteria.startTimeIsBefore
        ? {
            startTime: {
              lte: criteria.startTimeIsBefore,
            },
          }
        : undefined),
      ...(criteria.endTimeIsNullOrAfter
        ? {
            OR: [
              {
                endTime: {
                  gte: criteria.endTimeIsNullOrAfter,
                },
              },
              {
                endTime: null,
              },
            ],
          }
        : undefined),
    };
  }

  async findMany(
    criteria: ProblemRepository.Criteria,
    options: ProblemRepository.findMany.Options,
  ): Promise<ProblemRepository.findMany.Problem[]> {
    return this.prisma.problem.findMany({
      where: this.where(criteria),
      take: options?.take,
      ...(options?.cursor !== undefined
        ? {
            cursor: options.cursor,
            skip: 1,
          }
        : undefined),
      orderBy: {
        id: 'asc',
      },
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
        timeLimit: true,
        memoryLimit: true,
      },
    });
  }

  async findOne(
    criteria: ProblemRepository.Criteria,
  ): Promise<ProblemRepository.findOne.Problem | null> {
    return this.prisma.problem
      .findFirst({
        where: this.where(criteria),
        select: {
          id: true,
          name: true,
          description: true,
          startTime: true,
          endTime: true,
          templates: true,
          artifacts: true,
          timeLimit: true,
          memoryLimit: true,
        },
      })
      .then((problem) =>
        problem !== null
          ? {
              ...problem,
              templates: typia.assert<Templates>(problem.templates),
              artifacts: typia.assert<Artifacts>(problem.artifacts),
            }
          : problem,
      );
  }

  async findOneOrThrow(
    criteria: ProblemRepository.Criteria,
  ): Promise<ProblemRepository.findOne.Problem> {
    return this.findOne(criteria).then(ensure('Problem'));
  }

  async create(
    data: ProblemRepository.create.Data,
  ): Promise<ProblemRepository.create.Problem> {
    return this.prisma.problem.create({ data });
  }

  async update(id: bigint, data: ProblemRepository.update.Data): Promise<void> {
    await this.prisma.problem.update({ where: { id }, data });
  }

  async delete(id: bigint): Promise<void> {
    await this.prisma.problem.delete({ where: { id } });
  }
}
