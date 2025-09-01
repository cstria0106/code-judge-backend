import { UseGuards } from '@nestjs/common';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';
import { Observable, map } from 'rxjs';
import { match } from 'ts-pattern';
import typia from 'typia';

import { JwtGuard } from '../jwt/jwt.guard';
import { JwtPayload } from '../jwt/jwt.service';
import { User } from '../jwt/user.decorator';
import { Language } from '../problem/template';
import { tryTypia } from '../util/try-typia';
import { WsErrorResponse } from '../util/websocket';
import { SubmitStatus } from './status';
import { SubmitService } from './submit.service';

export module SubmitGateway {
  export module subscribe {
    export type Options = {
      id?: string;
      skip?: number;
      take?: 20;
    };

    export type UpdateData = {
      submit: {
        id: string;
        status: SubmitStatus;
      };
    };

    export type InitialData = {
      submits: {
        id: string;
        status: SubmitStatus;
        language: Language;
        problem: {
          id: string;
          name: string;
        };
        createdAt: Date;
      }[];
      count: number;
    };

    export type DetailData = {
      submit: {
        id: string;
        status: SubmitStatus;
        language: Language;
        problem: {
          id: string;
          name: string;
        };
        createdAt: Date;
        code: string;
      };
    };

    export type Response =
      | WsErrorResponse
      | (WsResponse<InitialData> & { event: 'get/submit/initial' })
      | (WsResponse<UpdateData> & { event: 'get/submit/update' })
      | (WsResponse<DetailData> & { event: 'get/submit/detail' });
  }
}

@WebSocketGateway(undefined, {
  cors: { origin: ['https://code.icnlab.dev'] },
  transports: ['websocket'],
})
export class SubmitGateway {
  constructor(private readonly submit: SubmitService) {}

  @UseGuards(JwtGuard)
  @SubscribeMessage('get/submit')
  async subscribe(
    @User() user: JwtPayload,
    @MessageBody() rawBody: unknown,
  ): Promise<Observable<SubmitGateway.subscribe.Response>> {
    const options = await tryTypia(async () =>
      typia.assert<SubmitGateway.subscribe.Options>(rawBody),
    );

    return this.submit.subscribe(user.id, options).then((observable) =>
      observable.pipe(
        map((e) =>
          match(e)
            .with({ type: 'detail' }, (e) => ({
              event: 'get/submit/detail' as const,
              data: {
                submit: {
                  ...e.submit,
                  problem: {
                    ...e.submit.problem,
                    id: e.submit.problem.id.toString(),
                  },
                },
              },
            }))
            .with({ type: 'initial' }, (e) => ({
              event: 'get/submit/initial' as const,
              data: {
                submits: e.submits.map((submit) => ({
                  ...submit,
                  problem: {
                    ...submit.problem,
                    id: submit.problem.id.toString(),
                  },
                })),
                count: e.count,
              },
            }))
            .with({ type: 'update' }, (e) => ({
              event: 'get/submit/update' as const,
              data: {
                submit: e.submit,
              },
            }))
            .exhaustive(),
        ),
        map((e) => typia.misc.assertPrune(e)),
      ),
    );
  }
}
