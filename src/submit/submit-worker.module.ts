import { Module } from '@nestjs/common';

import { CompilerModule } from '../compiler/compile.module';
import { JudgeModule } from '../judge/judge.module';
import { ProblemModule } from '../problem/problem.module';
import { StorageModule } from '../storage/storage.module';
import { SubmitWorkerService } from './submit-worker.service';
import { SubmitRepository } from './submit.repository';

@Module({
  imports: [ProblemModule, CompilerModule, JudgeModule, StorageModule],
  providers: [SubmitWorkerService, SubmitRepository],
})
export class SubmitWorkerModule {}
