import { Reflector } from '@nestjs/core';

type Role = 'ADMIN' | 'STUDENT';
export const Roles = Reflector.createDecorator<Role[] | undefined>();
