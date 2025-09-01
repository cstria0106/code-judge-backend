import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

import { AuthService } from './auth.service';

export namespace AuthController {
  export namespace Login {
    export type Body = AuthService.Login.Data;
    export type Response = AuthService.Login.Result;
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @TypedRoute.Post('login')
  async login(
    @TypedBody() body: AuthController.Login.Body,
  ): Promise<AuthController.Login.Response> {
    return this.auth.login(body);
  }
}
