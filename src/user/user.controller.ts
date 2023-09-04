import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import { JwtPayload } from '../jwt/jwt.service';
import { User } from '../jwt/user.decorator';
import { UserService } from './user.service';

export module UserController {
  export module UpdateMyUser {
    export type Body = UserService.Update.Data;
  }

  export module GetMyUser {
    export type Response = UserService.Get.Result;
  }
}

@Controller('user')
export class UserController {
  constructor(private readonly user: UserService) {}

  @TypedRoute.Put('my')
  async updateMyUser(
    @User() user: JwtPayload,
    @TypedBody() body: UserController.UpdateMyUser.Body,
  ) {
    return this.user.update(user.id, body);
  }

  @TypedRoute.Get('my')
  async getMyUser(
    @User() user: JwtPayload,
  ): Promise<UserController.GetMyUser.Response> {
    return this.user.get(user.id);
  }
}
