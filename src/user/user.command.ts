import { Logger } from '@nestjs/common';
import { Command, CommandRunner, Option, SubCommand } from 'nest-commander';
import typia from 'typia';

import { UserService } from './user.service';

@SubCommand({ name: 'create' })
export class UserCreateCommand extends CommandRunner {
  logger = new Logger(UserCreateCommand.name);

  constructor(private readonly user: UserService) {
    super();
  }

  async run(_: unknown, options: unknown): Promise<void> {
    let { name, id, password, role } = typia.assertEquals<{
      name: string;
      id: string;
      password?: string;
      role: 'STUDENT' | 'ADMIN';
    }>(options);

    // Generate random password
    let isRandomPassword = false;
    if (password === undefined) {
      password = Math.random().toString(36).slice(-8);
      isRandomPassword = true;
    }

    this.user.create({ name, id, password, shouldChangePassword: true, role });
    this.logger.log('User registered!');

    if (isRandomPassword) {
      console.log(`Generated password: ${password}`);
    }
  }

  @Option({
    flags: '--id [string]',
    required: true,
  })
  parseId(value: unknown) {
    return value;
  }

  @Option({
    flags: '--password [string]',
    required: false,
  })
  parsePassword(value: unknown) {
    return value;
  }

  @Option({
    flags: '--name [string]',
    required: true,
  })
  parseName(value: unknown) {
    return value;
  }

  @Option({
    flags: '--role [role]',
    defaultValue: 'STUDENT',
    choices: ['STUDENT', 'ADMIN'],
  })
  parseRole(value: unknown) {
    return value;
  }
}

@Command({ name: 'user', subCommands: [UserCreateCommand] })
export class UserCommand extends CommandRunner {
  async run(): Promise<void> {
    this.command.help();
  }
}
