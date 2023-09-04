import { WsException } from '@nestjs/websockets';
import { TypeGuardError } from 'typia';

export async function tryTypia<T>(f: () => Promise<T>) {
  try {
    return await f();
  } catch (e) {
    if (e instanceof TypeGuardError) {
      throw new WsException(e.message);
    } else {
      throw e;
    }
  }
}
