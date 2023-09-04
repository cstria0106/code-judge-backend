import { Module } from '@nestjs/common';

import { ProblemController } from './problem.controller';
import { ProblemRepository } from './problem.repository';
import { ProblemService } from './problem.service';

@Module({
  providers: [ProblemService, ProblemRepository],
  controllers: [ProblemController],
  exports: [ProblemService],
})
export class ProblemModule {}
