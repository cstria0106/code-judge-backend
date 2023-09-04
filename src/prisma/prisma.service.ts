import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';

const options = {
  log: ['query' as const, 'info' as const, 'warn' as const, 'error' as const],
} satisfies Prisma.PrismaClientOptions;

@Injectable()
export class PrismaService
  extends PrismaClient<typeof options>
  implements OnModuleInit
{
  constructor(config: ConfigService) {
    if (config.get('PRISMA_LOG') === '1') {
      super(options);
    } else {
      super();
    }
  }
  async onModuleInit() {
    await this.$connect();
  }
}
