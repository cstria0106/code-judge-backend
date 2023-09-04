import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { promisify } from 'util';

@Injectable()
export class CryptoService {
  async encrypt(plain: string, salt?: Buffer) {
    if (salt === undefined) {
      salt = crypto.randomBytes(32);
    }

    const cipher = await promisify(crypto.pbkdf2)(
      plain,
      salt,
      256,
      64,
      'sha512',
    );

    return [cipher, salt];
  }
}
