import { TypedBody, TypedRoute } from '@nestia/core';
import { Controller, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtPayload } from '../jwt/jwt.service';
import { Roles } from '../jwt/roles.decorator';
import { User } from '../jwt/user.decorator';
import { StorageService } from './storage.service';

export module StorageController {
  export module upload {
    export type Body = {
      keyPrefix?: string;
    };
  }
}

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Roles(['ADMIN'])
  @UseInterceptors(FileInterceptor('file'))
  @TypedRoute.Post()
  async upload(
    @User() user: JwtPayload,
    @UploadedFile('file') file: Express.Multer.File,
    @TypedBody() body: StorageController.upload.Body,
  ): Promise<void> {
    await this.storage.upload(
      file.stream,
      file.filename,
      file.size,
      user.id,
      body.keyPrefix,
    );
  }
}
