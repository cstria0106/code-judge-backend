import { JwtPayload } from './jwt/jwt.service';

declare module 'express' {
  interface Request {
    user?: JwtPayload | null;
  }
}

declare module 'socket.io' {
  interface Socket extends SocketWithUser {
    user?: JwtPayload | null;
  }
}
