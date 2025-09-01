import { TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';

export namespace PingController {
  export namespace Ping {
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
