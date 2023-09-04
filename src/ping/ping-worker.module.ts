import { Module } from '@nestjs/common';

import { PingWorkerService } from './ping-worker.service';

@Module({
  providers: [PingWorkerService],
})
export class PingWorkerModule {}
