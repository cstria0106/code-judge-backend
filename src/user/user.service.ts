import { BadRequestException, Injectable } from '@nestjs/common';

import { CryptoService } from '../crypto/crypto.service';
import { UserRepository } from './user.repository';

export module UserService {
  export module get {
    export type Result = {
      id: string;
      name: string;
      shouldChangePassword: boolean;
      role: 'STUDENT' | 'ADMIN';
    };
  }

  export module manageCreate {
    export type Data = {
      name: string;
      id: string;
      password: string;
      shouldChangePassword: boolean;
      role: 'STUDENT' | 'ADMIN';
    };
  }

  export module manageCreateMany {
    export type Data = {
      users: {
        name: string;
        id: string;
        password: string;
        shouldChangePassword: boolean;
        role: 'STUDENT' | 'ADMIN';
      }[]
    }
  }

  export module manageList {
    export type Result = {
      users: {
        id: string;
        name: string;
        role: 'STUDENT' | 'ADMIN'
      }[]
    }
  }

  export module update {
    export type Data = {
      password?: string;
    };
  }
}

@Injectable()
export class UserService {
  constructor(
    private readonly crypto: CryptoService,
    private readonly users: UserRepository,
  ) { }

  async get(userId: string): Promise<UserService.get.Result> {
    const user = await this.users.findOneOrThrow({ id: userId });
    return user;
  }

  async manageCreate(data: UserService.manageCreate.Data): Promise<void> {
    const { name, id, shouldChangePassword, role } = data;
    const [encryptedPassword, salt] = await this.crypto.encrypt(data.password);

    await this.users.createOne({
      name,
      id,
      password: encryptedPassword,
      salt,
      shouldChangePassword,
      role,
    });
  }

  async manageCreateMany(data: UserService.manageCreateMany.Data): Promise<void> {
    await this.users.createMany({
      users: await Promise.all(data.users.map(async user => {
        const { name, id, shouldChangePassword, role } = user;
        const [encryptedPassword, salt] = await this.crypto.encrypt(user.password);

        return {
          name, id, password: encryptedPassword, salt, shouldChangePassword, role
        };
      }))
    });
  }

  async manageList(cursor?: string): Promise<UserService.manageList.Result> {
    return {
      users: await this.users.findMany({
        cursor: cursor ? { id: cursor } : undefined,
        take: 100
      })
    }
  }

  private validatePassword(password: string) {
    if (password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }
  }

  async update(userId: string, data: UserService.update.Data): Promise<void> {
    const user = await this.users.findOneOrThrow({ id: userId });

    const { password } = data;

    if (password !== undefined) {
      this.validatePassword(password);

      const [encrypted, salt] = await this.crypto.encrypt(password);
      this.users.update(
        { id: userId },
        {
          password: { encrypted, salt },
          // Set to false when new password is given
          shouldChangePassword:
            data.password !== undefined ? false : user.shouldChangePassword,
        },
      );
    }
  }

  async destroy(userId: string): Promise<void> {
    const user = await this.users.findOneOrThrow({ id: userId });
    await this.users.delete({ id: user.id })
  }
}
