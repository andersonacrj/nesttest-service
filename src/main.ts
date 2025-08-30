import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { cfg } from './config/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.enableCors();
  await app.listen(cfg().port);
  console.log(
    `NestTest Notifications (EasyPost + Pickup) running on port ${cfg().port}`,
  );
}
bootstrap();
