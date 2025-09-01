import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { ensure } from '../util/ensure';

export module UserRepository {
  export type Criteria = {
    id: string;
  };

  export module findOne {
    export type User = {
      name: string;
      id: string;
      password: Uint8Array;
      salt: Uint8Array;
      shouldChangePassword: boolean;
      role: 'STUDENT' | 'ADMIN';
    };
  }

  export module findMany {
    export type User = {
      name: string;
      id: string;
      role: 'STUDENT' | 'ADMIN';
    };

    export type Options = {
      cursor?: {
        id: string;
      };
      take?: number;
    };
  }

  export module createOne {
    export type Data = {
      name: string;
      id: string;
      password: Buffer;
      salt: Buffer;
      shouldChangePassword: boolean;
      role: 'STUDENT' | 'ADMIN';
    };
  }

  export module createMany {
    export type Data = {
      users: {
        name: string;
        id: string;
        password: Buffer;
        salt: Buffer;
        shouldChangePassword: boolean;
        role: 'STUDENT' | 'ADMIN';
      }[];
    };
  }

  export module update {
    export type Data = {
      password?: {
        encrypted: Buffer;
        salt: Buffer;
      };
      shouldChangePassword?: boolean;
    };
  }
}

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(
    criteria: UserRepository.Criteria,
  ): Promise<UserRepository.findOne.User | null> {
    return this.prisma.user.findFirst({
      where: criteria,
    });
  }

  async findOneOrThrow(
    criteria: UserRepository.Criteria,
  ): Promise<UserRepository.findOne.User> {
    return this.findOne(criteria).then(ensure('User'));
  }

  async findMany(
    options: UserRepository.findMany.Options,
  ): Promise<UserRepository.findMany.User[]> {
    return this.prisma.user.findMany({
      orderBy: {
        id: 'asc',
      },
      skip: options.cursor !== undefined ? 1 : 0,
      cursor: options.cursor
        ? {
            id: options.cursor.id,
          }
        : undefined,
      take: options.take,
      select: {
        id: true,
        name: true,
        role: true,
      },
    });
  }

  async createOne(data: UserRepository.createOne.Data): Promise<void> {
    await this.prisma.user.create({
      data,
    });
  }

  async createMany(data: UserRepository.createMany.Data): Promise<void> {
    await this.prisma.user.createMany({ data: data.users });
  }

  async update(
    criteria: UserRepository.Criteria,
    data: UserRepository.update.Data,
  ): Promise<void> {
    const { password, ...rest } = data;
    await this.prisma.user.update({
      where: criteria,
      data: {
        ...(password !== undefined
          ? {
              password: password.encrypted,
              salt: password.salt,
            }
          : undefined),
        ...rest,
      },
    });
  }

  async delete(criteria: UserRepository.Criteria): Promise<void> {
    await this.prisma.user.delete({ where: criteria });
  }
}
