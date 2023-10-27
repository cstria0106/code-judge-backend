import { Module } from '@nestjs/common';

import { StorageModule } from '../storage/storage.module';
import { UserModule } from '../user/user.module';
import { ProblemController } from './problem.controller';
import { ProblemRepository } from './problem.repository';
import { ProblemService } from './problem.service';

@Module({
  imports: [StorageModule, UserModule],
  providers: [ProblemService, ProblemRepository],
  controllers: [ProblemController],
  exports: [ProblemService],
})
export class ProblemModule {}
