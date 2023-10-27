import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';
import { Language } from 'highlight.js';

import { Roles } from '../jwt/roles.decorator';
import { bigint } from '../util/bigint';
import { Artifacts } from './artifacts';
import { ProblemService } from './problem.service';
import { Codes, Templates } from './template';

export module ProblemController {
  export module list {
    export type Query = {
      cursor?: string;
      all?: boolean;
    };

    export type Response = {
      problems: {
        id: string;
        name: string;
        startTime: Date | null;
        endTime: Date | null;
        timeLimit: number;
        memoryLimit: number;
      }[];
    };
  }

  export module get {
    export type Response = {
      problem: {
        id: string;
        name: string;
        description: string;
        startTime: Date | null;
        endTime: Date | null;
        templates: Codes;
        timeLimit: number;
        memoryLimit: number;
      };
    };
  }

  export module listSubmits {
    export type Query = {
      onlySuccess: true;
      skip?: number;
      sort?: 'time' | 'memory';
    };

    export type Response = {
      submits: {
        language: Language;
        time: number;
        memory: number;
      }[];
    };
  }

  export module manageGet {
    export type Response = {
      problem: {
        id: string;
        name: string;
        description: string;
        startTime: Date | null;
        endTime: Date | null;
        artifacts: Artifacts;
        templates: Templates;
        timeLimit: number;
        memoryLimit: number;
      };
    };
  }

  export module manageList {
    export type Response = {
      problems: {
        id: string;
        name: string;
        startTime: Date | null;
        endTime: Date | null;
        timeLimit: number;
        memoryLimit: number;
      }[];
    };
  }

  export module manageCreate {
    export type Response = {
      problem: {
        id: string;
      };
    };
  }

  export module manageUpdate {
    export type Body = {
      name?: string;
      description?: string;
      artifacts?: Artifacts;
      templates?: Templates;
      startTime?: string | null;
      endTime?: string | null;
      timeLimit?: number;
      memoryLimit?: number;
    };
  }
}

@Controller('problem')
export class ProblemController {
  constructor(private readonly problem: ProblemService) {}

  @Roles(['ADMIN'])
  @TypedRoute.Get('manage/:id')
  async manageGet(
    @TypedParam('id', 'string') id: string,
  ): Promise<ProblemController.manageGet.Response> {
    return this.problem.manageGet(bigint(id, 'id')).then((result) => ({
      problem: {
        ...result.problem,
        id: result.problem.id.toString(),
        memoryLimit: Number(result.problem.memoryLimit),
      },
    }));
  }

  @Roles(['ADMIN'])
  @TypedRoute.Get('manage')
  async manageList(): Promise<ProblemController.manageList.Response> {
    return this.problem.manageList().then((result) => ({
      problems: result.problems.map((problem) => ({
        ...problem,
        id: problem.id.toString(),
        memoryLimit: Number(problem.memoryLimit),
      })),
    }));
  }

  @Roles(['ADMIN'])
  @TypedRoute.Post('manage')
  async manageCreate(): Promise<ProblemController.manageCreate.Response> {
    return this.problem.manageCreate().then((result) => ({
      problem: {
        ...result.problem,
        id: result.problem.id.toString(),
      },
    }));
  }

  @Roles(['ADMIN'])
  @TypedRoute.Put('manage/:id')
  async manageUpdate(
    @TypedParam('id', 'string') id: string,
    @TypedBody() body: ProblemController.manageUpdate.Body,
  ): Promise<void> {
    await this.problem.manageUpdate(bigint(id, 'id'), {
      ...body,
      startTime:
        body.startTime !== undefined && body.startTime !== null
          ? new Date(body.startTime)
          : body.startTime,
      endTime:
        body.endTime !== undefined && body.endTime !== null
          ? new Date(body.endTime)
          : body.endTime,
      memoryLimit: bigint(body.memoryLimit),
    });
  }

  @Roles(['ADMIN'])
  @TypedRoute.Delete('manage/:id')
  async manageDestroy(@TypedParam('id', 'string') id: string) {
    await this.problem.manageDestroy(bigint(id, 'id'));
  }

  @TypedRoute.Get()
  async list(
    @TypedQuery() query: ProblemController.list.Query,
  ): Promise<ProblemController.list.Response> {
    return this.problem
      .list({
        ...query,
        cursor: bigint(query.cursor, 'cursor'),
      })
      .then((result) => ({
        problems: result.problems.map((problem) => ({
          ...problem,
          id: problem.id.toString(),
          memoryLimit: Number(problem.memoryLimit),
        })),
      }));
  }

  @TypedRoute.Get(':id')
  async get(
    @TypedParam('id', 'string') id: string,
  ): Promise<ProblemController.get.Response> {
    return this.problem.get(bigint(id, 'id')).then((result) => ({
      problem: {
        ...result.problem,
        id: result.problem.id.toString(),
        memoryLimit: Number(result.problem.memoryLimit),
      },
    }));
  }
}
