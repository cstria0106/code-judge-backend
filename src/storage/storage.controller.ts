import {
  Body,
  Controller,
  Head,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import typia from 'typia';

import { JwtPayload } from '../jwt/jwt.service';
import { Roles } from '../jwt/roles.decorator';
import { User } from '../jwt/user.decorator';
import { StorageService } from './storage.service';

export module StorageController {
  export module upload {
    export type Body = {
      keyPrefix?: string;
    };

    export type Response = {
      id: string;
    };
  }
}

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Roles(['ADMIN'])
  @UseInterceptors(FileInterceptor('file'))
  @Post()
  async upload(
    @User() user: JwtPayload,
    @UploadedFile('file') file: Express.Multer.File,
    @Body() body: StorageController.upload.Body,
  ): Promise<StorageController.upload.Response> {
    typia.assert(body);

    const id = await this.storage.upload(
      file.buffer,
      file.originalname,
      file.size,
      user.id,
      body.keyPrefix,
    );
    return { id };
  }
}
