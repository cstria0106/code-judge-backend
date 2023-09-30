import { NestFactory } from '@nestjs/core';
import compression from 'compression';

import { AppModule } from './app.module';
import { SubmitService } from './submit/submit.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(compression());

  const submitService = app.get(SubmitService);
  await submitService.clean();

  app.enableCors();
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

bootstrap();
