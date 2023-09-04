import { TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

export module PingController {
  export module Ping {
    export type Response = {
      ok: boolean;
    };
  }
}

@Controller('ping')
export class PingController {
  @TypedRoute.Get()
  async ping(): Promise<PingController.Ping.Response> {
    return { ok: true };
  }
}
