import { Module } from '@nestjs/common';

import { FileRepository } from './file.repository';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Module({
  providers: [StorageService, FileRepository],
  controllers: [StorageController],
  exports: [StorageService, FileRepository],
})
export class StorageModule {}
