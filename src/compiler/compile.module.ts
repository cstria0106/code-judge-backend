import { Module } from '@nestjs/common';

import { CompilerService } from './compile.service';

@Module({
  providers: [CompilerService],
  exports: [CompilerService],
})
export class CompilerModule {}
