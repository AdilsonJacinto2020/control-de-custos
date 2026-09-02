import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { Express } from 'express';

let server: Express;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    await app.listen(process.env.PORT ?? 3000);
  } else {
    await app.init();
    const instance = app.getHttpAdapter().getInstance();
    return instance;
  }
}

// Para execução local
if (!process.env.VERCEL) {
  bootstrap();
}

// Handler para Vercel Serverless Function
export default async function handler(req: any, res: any) {
  if (!server) {
    server = (await bootstrap()) as Express;
  }
  return server(req, res);
}
