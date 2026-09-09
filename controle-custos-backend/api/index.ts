import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import express, { Express } from 'express';

const server: Express = express();
let isReady = false;

// Handler de fallback direto para verificação rápida do webhook da Meta
server.get('/webhooks/whatsapp', (req, res, next) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'fincontrol_token';

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  next();
});

server.get(['/api/health', '/health'], (req, res) => {
  return res.status(200).json({ status: 'ok', serverTime: new Date().toISOString() });
});

server.get(['/api/debug-env', '/debug-env'], (req, res) => {
  return res.status(200).json({
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasGoogleClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
    hasJwtSecret: Boolean(process.env.JWT_SECRET),
    nodeEnv: process.env.NODE_ENV || 'undefined',
    dbHost: process.env.DB_HOST || 'undefined',
  });
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'https://fincontrol.app'];

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.indexOf(origin) !== -1 ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        process.env.NODE_ENV !== 'production'
      ) {
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

  await app.init();
}

// CORS middleware explícito a nível do Express antes de qualquer processamento
server.use((req, res, next) => {
  const origin = req.headers.origin as string;
  if (
    !origin ||
    origin.endsWith('.vercel.app') ||
    origin.includes('localhost') ||
    origin.includes('fincontrol')
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

export default async function handler(req: any, res: any) {
  const origin = req.headers?.origin;
  if (
    !origin ||
    origin.endsWith('.vercel.app') ||
    origin.includes('localhost') ||
    origin.includes('fincontrol')
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Se for a verificação do webhook da Meta, atende imediatamente sem esperar o NestJS carregar banco
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

  if (req.url === '/api/debug-env' || req.url === '/debug-env') {
    return res.status(200).json({
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasGoogleClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
      nodeEnv: process.env.NODE_ENV || 'undefined',
      dbHost: process.env.DB_HOST || 'undefined',
    });
  }

  try {
    if (!isReady) {
      await bootstrap();
      isReady = true;
    }
    return server(req, res);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Vercel Initialization Error',
      message: err?.message,
      details: String(err),
      stack: err?.stack,
    });
  }
}
