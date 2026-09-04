import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import express, { Express } from 'express';

const server: Express = express();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'https://fincontrol.app'];

  app.enableCors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (como mobile apps, curl ou Postman) ou em origens permitidas
      if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Origem não permitida pelo CORS'));
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  if (!process.env.VERCEL) {
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`Servidor rodando em http://localhost:${port}`);
  } else {
    await app.init();
  }
}

let isInitialized = false;

// Handler para Vercel Serverless Function
export default async function handler(req: any, res: any) {
  // Verificação instantânea do webhook da Meta para evitar timeout ou falha de boot da DB
  const mode = req.query?.['hub.mode'];
  const token = req.query?.['hub.verify_token'];
  const challenge = req.query?.['hub.challenge'];
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'fincontrol_token';

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(challenge);
  }

  if (req.url === '/api/health' || req.url === '/health') {
    return res.status(200).json({ status: 'ok', serverTime: new Date().toISOString() });
  }

  try {
    if (!isInitialized) {
      await bootstrap();
      isInitialized = true;
    }
    return server(req, res);
  } catch (error: any) {
    console.error('Error during Vercel function invocation:', error);
    return res.status(500).json({
      error: 'Error initializing NestJS application',
      message: error?.message || 'Unknown error',
      stack: error?.stack,
    });
  }
}

// Para execução local
if (!process.env.VERCEL) {
  bootstrap();
}

