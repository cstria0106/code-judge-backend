import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { PingController } from './ping.controller';
import { PingService } from './ping.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [PingService],
  controllers: [PingController],
})
export class PingModule {}
