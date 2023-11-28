import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { ensure } from '../util/ensure';

export module FileRepository {
  export type Criteria = {
    id: string;
  };

  export module findOne {
    export type File = {
      id: string;
      filename: string;
      uploaderId: string;
    };
  }
  export module createOne {
    export type Data = {
      id: string;
      filename: string;
      uploaderId: string;
    };
  }
}

@Injectable()
export class FileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(
    criteria: FileRepository.Criteria,
  ): Promise<FileRepository.findOne.File | null> {
    return this.prisma.file.findFirst({ where: criteria });
  }

  async findOneOrThrow(
    criteria: FileRepository.Criteria,
  ): Promise<FileRepository.findOne.File> {
    return this.findOne(criteria).then(ensure('file'));
  }

  async createOne(data: FileRepository.createOne.Data): Promise<void> {
    await this.prisma.file.create({ data });
  }

  async destroyOne(criteria: FileRepository.Criteria): Promise<void> {
    await this.prisma.file.delete({ where: criteria });
  }
}
