import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request } from 'express';
import { Socket } from 'socket.io';

import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload, JwtService } from './jwt.service';
import { Roles } from './roles.decorator';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get(Roles, context.getHandler());
    const token = this.getBearerToken(context);

    if (token === null) {
      if (roles !== undefined) throw new ForbiddenException();
      return true;
    }

    let payload: JwtPayload;

    try {
      payload = this.jwt.decode(token);
      this.setUser(context, payload);
    } catch {
      throw new ForbiddenException();
    }

    // Check role
    if (roles !== undefined) {
      const user = await this.prisma.user.findFirstOrThrow({
        where: { id: payload.id },
      });

      if (!roles.includes(user.role)) {
        throw new ForbiddenException();
      }
    }

    return true;
  }

  private setUser(context: ExecutionContext, user: JwtPayload) {
    if (context.getType() === 'http') {
      const request: Request = context.switchToHttp().getRequest();
      request.user = user;
    } else if (context.getType() === 'ws') {
      const socket: Socket = context.switchToWs().getClient();
      socket.user = user;
    }
  }

  private getBearerToken(context: ExecutionContext): string | null {
    let token: string | undefined;
    if (context.getType() === 'http') {
      const request: Request = context.switchToHttp().getRequest();
      token = request.headers.authorization;
    } else if (context.getType() === 'ws') {
      const socket: Socket = context.switchToWs().getClient();
      token = socket.handshake.auth.token;
    }

    const prefix = 'Bearer ';
    if (token !== undefined && token.startsWith(prefix)) {
      return token.substring(prefix.length);
    }

    return null;
  }
}
