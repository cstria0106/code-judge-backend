import { Module } from '@nestjs/common';

import { CompilerModule } from '../compiler/compile.module';
import { JudgeModule } from '../judge/judge.module';
import { JwtModule } from '../jwt/jwt.module';
import { ProblemModule } from '../problem/problem.module';
import { SubmitController } from './submit.controller';
import { SubmitGateway } from './submit.gateway';
import { SubmitRepository } from './submit.repository';
import { SubmitService } from './submit.service';

@Module({
  imports: [ProblemModule, CompilerModule, JudgeModule, JwtModule],
  providers: [SubmitService, SubmitRepository, SubmitGateway],
  controllers: [SubmitController],
})
export class SubmitModule {}
