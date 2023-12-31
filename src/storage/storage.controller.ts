import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';
import { Body, Controller } from '@nestjs/common';
import typia from 'typia';

import { JwtPayload } from '../jwt/jwt.service';
import { Roles } from '../jwt/roles.decorator';
import { User } from '../jwt/user.decorator';
import { StorageService } from './storage.service';

export module StorageController {
  export module create {
    export type Body = {
      filename: string;
      keyPrefix?: string;
    };

    export type Response = {
      id: string;
      uploadUrl: string;
    };
  }

  export module get {
    export type Response = {
      id: string;
      filename: string;
      downloadUrl: string;
    };
  }
}

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Roles(['ADMIN'])
  @TypedRoute.Post()
  async create(
    @User() user: JwtPayload,
    @TypedBody() body: StorageController.create.Body,
  ): Promise<StorageController.create.Response> {
    return this.storage.create(user.id, body.filename, body.keyPrefix);
  }

  @Roles(['ADMIN'])
  @TypedRoute.Get(':id')
  async get(
    @TypedParam('id') id: string,
  ): Promise<StorageController.get.Response> {
    return this.storage.get(id);
  }
}
