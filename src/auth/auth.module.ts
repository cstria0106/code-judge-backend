import { Module } from '@nestjs/common';

import { CryptoModule } from '../crypto/crypto.module';
import { JwtModule } from '../jwt/jwt.module';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [UserModule, JwtModule, CryptoModule],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
