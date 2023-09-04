import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import typia from 'typia';

import { Response } from './transform.interceptor';

interface NestiaBadRequestExceptionResponse {
  path: string;
  reason: string;
  expected: string;
}

type ErrorData = {
  message: string;
} & Partial<NestiaBadRequestExceptionResponse>;

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const status = exception.getStatus();

    const response: Response<ErrorData> = {
      result: 'error',
      statusCode: exception.getStatus(),
      data: {
        message: exception.message,
      },
    };

    const exceptionResponse = exception.getResponse();
    if (typia.is<NestiaBadRequestExceptionResponse>(exceptionResponse)) {
      response.data = {
        ...response.data,
        ...exceptionResponse,
      };
    }

    ctx.getResponse().status(status).json(response);
  }
}
