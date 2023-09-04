import { WsResponse } from '@nestjs/websockets';

export type WsErrorResponse = WsResponse<{
  reason: string;
}> & {
  event: 'error';
};
