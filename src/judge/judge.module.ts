import { Module } from '@nestjs/common';

import { JudgeService } from './judge.service';

@Module({
  providers: [JudgeService],
  exports: [JudgeService],
})
export class JudgeModule {}
