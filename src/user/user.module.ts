import { Module } from '@nestjs/common';

import { CryptoModule } from '../crypto/crypto.module';
import { JwtModule } from '../jwt/jwt.module';
import { UserCommand, UserCreateCommand } from './user.command';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [JwtModule, CryptoModule],
  controllers: [UserController],
  providers: [UserService, UserRepository, UserCommand, UserCreateCommand],
  exports: [UserService, UserRepository],
})
export class UserModule {}
