import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CompilerModule } from '../compiler/compile.module';
import { JudgeModule } from '../judge/judge.module';
import { ProblemModule } from '../problem/problem.module';
import { SubmitWorkerService } from './submit-worker.service';
import { SubmitRepository } from './submit.repository';

@Module({
  imports: [ProblemModule, CompilerModule, JudgeModule],
  providers: [SubmitWorkerService, SubmitRepository],
})
export class SubmitWorkerModule {}
