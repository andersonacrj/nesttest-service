import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Request, Response } from 'express';
import 'reflect-metadata';
import { AppModule } from './app.module';
import { cfg } from './config/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Middleware to handle the root path
  app.use('/', (req: Request, res: Response, next) => {
    if (req.url === '/') {
      return res.send('Hello World');
    }
    next();
  });

  
  const config = new DocumentBuilder()
    .addBearerAuth()
    .setTitle("NestTest Service - API Documentation")
    .setDescription('API documentation for the NestTest service.')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);
  
  app.enableShutdownHooks();
  app.enableCors();
  await app.listen(cfg().port);
  console.log(
    `NestTest service is running on port ${cfg().port}`,
  );
}
bootstrap();
