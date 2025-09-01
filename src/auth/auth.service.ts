import { BadRequestException, Injectable } from '@nestjs/common';

import { CryptoService } from '../crypto/crypto.service';
import { JwtService } from '../jwt/jwt.service';
import { UserRepository } from '../user/user.repository';

export namespace AuthService {
  export namespace Login {
    export type Data = {
      id: string;
      password: string;
    };
    export type Result = {
      token: string;
    };
  }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UserRepository,
    private readonly crypto: CryptoService,
  ) {}

  // Check and returns token
  async login(data: AuthService.Login.Data): Promise<AuthService.Login.Result> {
    const { id, password } = data;

    const user = await this.users.findOne({ id });
    if (user === null) {
      throw new BadRequestException('Invalid username or password');
    }

    const [encryptedPassword, _] = await this.crypto.encrypt(
      password,
      Buffer.from(user.salt),
    );
    if (encryptedPassword.compare(user.password) !== 0) {
      throw new BadRequestException('Invalid username or password');
    }

    const token = this.jwt.encode({ id: user.id });
    return { token };
  }
}
