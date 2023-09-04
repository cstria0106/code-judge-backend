import {
  ExecutionContext,
  ForbiddenException,
  createParamDecorator,
} from '@nestjs/common';

import { JwtPayload } from './jwt.service';

export const User = createParamDecorator<{ optional?: boolean } | undefined>(
  (data, ctx: ExecutionContext) => {
    let user: JwtPayload;
    if (ctx.getType() === 'http') {
      user = ctx.switchToHttp().getRequest().user;
    } else if (ctx.getType() === 'ws') {
      user = ctx.switchToWs().getClient().user;
    } else {
      throw new ForbiddenException();
    }

    if (
      data === undefined ||
      data.optional === undefined ||
      data.optional === false
    ) {
      if (user === undefined || user === null) {
        throw new ForbiddenException();
      }
    }

    return user;
  },
);
