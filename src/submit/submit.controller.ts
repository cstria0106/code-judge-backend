import { TypedQuery, TypedRoute } from '@nestia/core';
import { Body, Controller } from '@nestjs/common';

import { JwtPayload } from '../jwt/jwt.service';
import { Roles } from '../jwt/roles.decorator';
import { User } from '../jwt/user.decorator';
import { Language } from '../problem/template';
import { bigint } from '../util/bigint';
import { SubmitStatus } from './status';
import { SubmitService } from './submit.service';

export module SubmitController {
  export module list {
    export type Query = {
      skip?: number;
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
    };
  }

  export module manageList {
    export type Query = {
      skip?: number;
      userId?: string;
      problemId?: string;
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
      }[];
    };
  }

  export module create {
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

@Controller('submit')
export class SubmitController {
  constructor(private readonly submit: SubmitService) {}

  @TypedRoute.Get()
  async list(
    @User() user: JwtPayload,
    @TypedQuery() query: SubmitController.list.Query,
  ): Promise<SubmitController.list.Response> {
    return this.submit.list(user.id, { skip: query.skip }).then((result) => ({
      submits: result.submits.map((submit) => ({
        ...submit,
        problem: {
          ...submit.problem,
          id: submit.problem.id.toString(),
        },
      })),
    }));
  }

  @Roles(['ADMIN'])
  @TypedRoute.Get('manage')
  async manageList(
    @TypedQuery() query: SubmitController.manageList.Query,
  ): Promise<SubmitController.manageList.Response> {
    return this.submit
      .manageList({
        userId: query.userId,
        skip: query.skip,
        problemId: bigint(query.problemId),
      })
      .then((result) => ({
        submits: result.submits.map((submit) => ({
          ...submit,
          problem: {
            ...submit.problem,
            id: submit.problem.id.toString(),
          },
        })),
      }));
  }

  @TypedRoute.Post()
  async create(
    @User() user: JwtPayload,
    @Body() body: SubmitController.create.Body,
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
}
