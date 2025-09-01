import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { Controller, ForbiddenException } from '@nestjs/common';

import { JwtPayload } from '../jwt/jwt.service';
import { Roles } from '../jwt/roles.decorator';
import { User } from '../jwt/user.decorator';
import { Artifacts } from '../problem/artifacts';
import { Language } from '../problem/template';
import { bigint } from '../util/bigint';
import { SubmitStatus } from './status';
import { SubmitService } from './submit.service';

export namespace SubmitController {
  export namespace list {
    export type Query = {
      skip?: number;
      take?: 20;
    };

    export type Response = {
      submits: {
        id: string;
        problem: {
          id: string;
          name: string;
        };
        language: Language;
        status: SubmitStatus;
        createdAt: Date;
      }[];
      count: number;
    };
  }

  export namespace manageList {
    export type Query = {
      searchId?: string;
      userId?: string;
      problemId?: string;
      language?: Language;
      statusType?: SubmitStatus['type'];
      statusResultType?: (SubmitStatus & {
        type: 'COMPLETE';
      })['result']['type'];
      skip?: number;
      take?: number;
    };

    export type Response = {
      submits: {
        user: {
          id: string;
          name: string;
        };
        id: string;
        problem: {
          id: string;
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

  export namespace get {
    export type Response = {
      submit: {
        id: string;
        problem: {
          id: string;
          name: string;
        };
        language: Language;
        status: SubmitStatus;
        createdAt: Date;
        code: string;
      };
    };
  }

  export namespace manageGet {
    export type Response = {
      submit: {
        user: {
          id: string;
          name: string;
        };
        id: string;
        problem: {
          id: string;
          name: string;
        };
        language: Language;
        status: SubmitStatus;
        createdAt: Date;
        debugText: string;
        code: string;
      };
    };
  }

  export namespace create {
    export type Body = {
      problemId: string;
      language: Language;
      code: string;
    };

    export type Response = {
      submit: {
        id: string;
      };
    };
  }
}

export namespace ManageJudge {
  export type Body = {
    problemId: string;
    code: string;
    language: Language;
    inputId: keyof Artifacts['inputs'];
  };
  export type Response = {
    result: SubmitStatus;
  };
}

@Controller('submit')
export class SubmitController {
  constructor(private readonly submit: SubmitService) {}

  @TypedRoute.Get()
  async list(
    @User() user: JwtPayload,
    @TypedQuery() query: SubmitController.list.Query,
  ): Promise<SubmitController.list.Response> {
    return this.submit
      .list(user.id, { skip: query.skip, take: query.take })
      .then((result) => ({
        submits: result.submits.map((submit) => ({
          ...submit,
          problem: {
            ...submit.problem,
            id: submit.problem.id.toString(),
          },
        })),
        count: result.count,
      }));
  }

  @Roles(['ADMIN'])
  @TypedRoute.Get('manage')
  async manageList(
    @TypedQuery() query: SubmitController.manageList.Query,
  ): Promise<SubmitController.manageList.Response> {
    return this.submit
      .manageList({
        search: {
          id: query.searchId,
        },
        userId: query.userId,
        problemId: bigint(query.problemId),
        language: query.language,
        status: {
          type: query.statusType,
          result: {
            type: query.statusResultType,
          },
        },
        skip: query.skip,
        take: query.take,
      })
      .then((result) => ({
        submits: result.submits.map((submit) => ({
          ...submit,
          problem: {
            ...submit.problem,
            id: submit.problem.id.toString(),
          },
        })),
        count: result.count,
      }));
  }

  @Roles(['ADMIN', 'STUDENT'])
  @TypedRoute.Get(':id')
  async get(
    @TypedParam('id') id: string,
    @User() user: JwtPayload,
  ): Promise<SubmitController.get.Response> {
    const submit = await this.submit.get(id);
    if (submit.user.id !== user.id) {
      throw new ForbiddenException();
    }
    return {
      submit: {
        ...submit,
        problem: {
          ...submit.problem,
          id: submit.problem.id.toString(),
        },
      },
    };
  }

  @Roles(['ADMIN'])
  @TypedRoute.Get('manage/:id')
  async manageGet(
    @TypedParam('id') id: string,
  ): Promise<SubmitController.manageGet.Response> {
    return {
      submit: await this.submit.get(id).then((submit) => ({
        ...submit,
        problem: {
          ...submit.problem,
          id: submit.problem.id.toString(),
        },
      })),
    };
  }

  @TypedRoute.Post()
  async create(
    @User() user: JwtPayload,
    @TypedBody() body: SubmitController.create.Body,
  ): Promise<SubmitController.create.Response> {
    return this.submit
      .create({
        ...body,
        userId: user.id,
        problemId: bigint(body.problemId),
      })
      .then((result) => ({
        submit: {
          ...result.submit,
          id: result.submit.id.toString(),
        },
      }));
  }

  @TypedRoute.Post('manage/judge')
  async manageJudge(
    @TypedBody() body: ManageJudge.Body,
  ): Promise<ManageJudge.Response> {
    const result = await this.submit.createTemporary(body);
    return {
      result,
    };
  }
}
