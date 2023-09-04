import { CommandFactory } from 'nest-commander';

import { AppModule } from './app.module';

async function main() {
  await CommandFactory.run(AppModule);
}

main();
