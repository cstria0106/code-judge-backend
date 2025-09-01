import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import { JwtPayload } from '../jwt/jwt.service';
import { Roles } from '../jwt/roles.decorator';
import { User } from '../jwt/user.decorator';
import { UserService } from './user.service';

export namespace UserController {
  export namespace updateMyUser {
    export type Body = UserService.update.Data;
  }

  export namespace getMyUser {
    export type Response = UserService.get.Result;
  }

  export namespace manageCreate {
    export type Body = UserService.manageCreate.Data;
  }

  export namespace manageCreateMany {
    export type Body = UserService.manageCreateMany.Data;
  }

  export namespace manageList {
    export type Query = {
      cursor?: string;
    };

    export type Response = UserService.manageList.Result;
  }
}

@Controller('user')
export class UserController {
  constructor(private readonly user: UserService) {}

  @TypedRoute.Put('my')
  async updateMyUser(
    @User() user: JwtPayload,
    @TypedBody() body: UserController.updateMyUser.Body,
  ) {
    return this.user.update(user.id, body);
  }

  @TypedRoute.Get('my')
  async getMyUser(
    @User() user: JwtPayload,
  ): Promise<UserController.getMyUser.Response> {
    return this.user.get(user.id);
  }

  @TypedRoute.Get()
  async manageList(
    @TypedQuery() query: UserController.manageList.Query,
  ): Promise<UserController.manageList.Response> {
    return this.user.manageList(query.cursor);
  }

  @Roles(['ADMIN'])
  @TypedRoute.Delete(':id')
  async manageDestroy(@TypedParam('id') userId: string): Promise<void> {
    await this.user.destroy(userId);
  }
}
