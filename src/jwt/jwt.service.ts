import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { F } from 'ts-toolbelt';
import typia from 'typia';

export interface JwtPayload {
  id: string;
}

@Injectable()
export class JwtService {
  private secret: Buffer;

  constructor(config: ConfigService) {
    const secret = config.getOrThrow<string>('JWT_SECRET');
    const secretBytes = Buffer.from(secret, 'base64');
    this.secret = secretBytes;
  }

  encode<T>(data: F.Exact<T, JwtPayload>): string {
    return jwt.sign(data, this.secret);
  }

  decode(token: string): JwtPayload {
    return typia.assertPrune<JwtPayload>(jwt.verify(token, this.secret));
  }
}
