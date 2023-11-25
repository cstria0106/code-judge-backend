import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';
import { Body, Controller } from '@nestjs/common';
import typia from 'typia';

import { JwtPayload } from '../jwt/jwt.service';
import { Roles } from '../jwt/roles.decorator';
import { User } from '../jwt/user.decorator';
import { StorageService } from './storage.service';

export module StorageController {
  export module getUploadUrl {
    export type Body = {
      filename: string;
      keyPrefix?: string;
    };

    export type Response = {
      id: string;
      url: string;
    };
  }

  export module getDownloadUrl {
    export type Response = {
      url: string;
    };
  }
}

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Roles(['ADMIN'])
  @TypedRoute.Post()
  async getUploadUrl(
    @User() user: JwtPayload,
    @TypedBody() body: StorageController.getUploadUrl.Body,
  ): Promise<StorageController.getUploadUrl.Response> {
    typia.assert(body);

    return this.storage.getUploadUrl(user.id, body.filename, body.keyPrefix);
  }

  @Roles(['ADMIN'])
  @TypedRoute.Get(':id')
  async getDownloadUrl(
    @TypedParam('id') id: string,
  ): Promise<StorageController.getDownloadUrl.Response> {
    return { url: await this.storage.getDownloadUrl(id) };
  }
}
