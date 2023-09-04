import { BadRequestException, Injectable } from '@nestjs/common';

import { CryptoService } from '../crypto/crypto.service';
import { UserRepository } from './user.repository';

export module UserService {
  export module Get {
    export type Result = {
      id: string;
      name: string;
      shouldChangePassword: boolean;
      role: 'STUDENT' | 'ADMIN';
    };
  }

  export module Create {
    export type Data = {
      name: string;
      id: string;
      password: string;
      shouldChangePassword: boolean;
      role: 'STUDENT' | 'ADMIN';
    };
  }

  export module Update {
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
  ) {}

  async get(userId: string): Promise<UserService.Get.Result> {
    const user = await this.users.findOneOrThrow({ id: userId });
    return user;
  }

  async create(data: UserService.Create.Data): Promise<void> {
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

  private validatePassword(password: string) {
    if (password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }
  }

  async update(userId: string, data: UserService.Update.Data): Promise<void> {
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
}
