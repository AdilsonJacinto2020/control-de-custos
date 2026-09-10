import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import express, { Express } from 'express';

const server: Express = express();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [
        'https://control-de-custos-v9ju.vercel.app',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
      ];

  app.enableCors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (como mobile apps, curl ou webhooks server-to-server) ou em origens autorizadas
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
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

// CORS middleware explícito a nível do Express antes de qualquer processamento
server.use((req, res, next) => {
  const origin = req.headers.origin as string;
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [
        'https://control-de-custos-v9ju.vercel.app',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
      ];

  if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
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

let lastWebhooksReceived: any[] = [];
let isInitialized = false;

// Handler para Vercel Serverless Function
export default async function handler(req: any, res: any) {
  // Capture webhook requests directly at Vercel edge
  if (req.method === 'POST' && (req.url === '/webhooks/whatsapp' || req.url?.startsWith('/webhooks/whatsapp'))) {
    const rawPayload = req.body;
    lastWebhooksReceived.unshift({
      timestamp: new Date().toISOString(),
      body: rawPayload,
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent'],
      },
    });
    if (lastWebhooksReceived.length > 10) lastWebhooksReceived.pop();
  }
  const origin = req.headers?.origin;
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [
        'https://control-de-custos-v9ju.vercel.app',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
      ];

  if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Verificação instantânea do webhook da Meta para evitar timeout ou falha de boot da DB
  const mode = req.query?.['hub.mode'];
  const token = req.query?.['hub.verify_token'];
  const challenge = req.query?.['hub.challenge'];
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (verifyToken && mode === 'subscribe' && token === verifyToken && challenge) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(challenge);
  }

  if (req.url === '/api/health' || req.url === '/health') {
    return res.status(200).json({ status: 'ok', serverTime: new Date().toISOString() });
  }

  const reqUrl = req.url || '';

  // Endpoint de diagnóstico para inspecionar webhooks recebidos em tempo real
  if (reqUrl.startsWith('/api/live-webhooks') || reqUrl.startsWith('/live-webhooks')) {
    const debugKey = process.env.DEBUG_KEY;
    if (!debugKey || req.query?.key !== debugKey) {
      return res.status(404).json({ statusCode: 404, message: 'Cannot GET ' + reqUrl });
    }
    return res.status(200).json({
      total: lastWebhooksReceived.length,
      logs: lastWebhooksReceived,
    });
  }
  if (reqUrl.startsWith('/api/debug-env') || reqUrl.startsWith('/debug-env')) {
    const debugKey = process.env.DEBUG_KEY;
    if (!debugKey || req.query?.key !== debugKey) {
      return res.status(404).json({ statusCode: 404, message: 'Cannot GET ' + reqUrl });
    }

    return res.status(200).json({
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasGoogleClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
      hasWhatsappPhoneNumberId: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
      whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'missing',
      hasWhatsappAccessToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
      whatsappAccessTokenLength: process.env.WHATSAPP_ACCESS_TOKEN ? process.env.WHATSAPP_ACCESS_TOKEN.length : 0,
      hasWhatsappVerifyToken: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
      hasEvolutionApiUrl: Boolean(process.env.EVOLUTION_API_URL),
      hasEvolutionApiKey: Boolean(process.env.EVOLUTION_API_KEY),
      nodeEnv: process.env.NODE_ENV || 'undefined',
    });
  }

  if (reqUrl.startsWith('/api/test-db') || reqUrl.startsWith('/test-db')) {
    const debugKey = process.env.DEBUG_KEY;
    if (!debugKey || req.query?.key !== debugKey) {
      return res.status(404).json({ statusCode: 404, message: 'Cannot GET ' + reqUrl });
    }

    const { Client } = await import('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await client.connect();
      const result = await client.query('SELECT NOW()');
      await client.end();
      return res.status(200).json({ status: 'db_connected', now: result.rows[0] });
    } catch (dbErr: any) {
      return res.status(500).json({
        status: 'db_connection_failed',
        error: dbErr?.message,
        code: dbErr?.code,
      });
    }
  }

  // Endpoint de teste de envio direto via Meta Cloud API para diagnóstico
  if (reqUrl.startsWith('/api/test-whatsapp') || reqUrl.startsWith('/test-whatsapp')) {
    const debugKey = process.env.DEBUG_KEY;
    if (!debugKey || req.query?.key !== debugKey) {
      return res.status(404).json({ statusCode: 404, message: 'Cannot GET ' + reqUrl });
    }

    const to = (req.query?.to as string || '244947501108').replace(/[^0-9]/g, '');
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({ error: 'Credenciais ausentes', phoneNumberId: Boolean(phoneNumberId), accessToken: Boolean(accessToken) });
    }

    try {
      const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
      const metaResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: '🤖 Teste direto do FinControl WhatsApp Bot! Se você recebeu isso, a conexão com a Meta está 100% ativa.' },
        }),
      });

      const responseBody = await metaResponse.json().catch(() => null);
      return res.status(metaResponse.status).json({
        httpStatus: metaResponse.status,
        metaStatus: metaResponse.ok ? 'success' : 'failed',
        metaResponseBody: responseBody,
      });
    } catch (fetchErr: any) {
      return res.status(500).json({
        error: 'Fetch exception',
        message: fetchErr?.message,
      });
    }
  }

  try {
    if (!isInitialized) {
      await bootstrap();
      isInitialized = true;
    }
    return server(req, res);
  } catch (error: any) {
    console.error('Error during Vercel function invocation:', error);
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    return res.status(500).json({
      error: 'Error initializing NestJS application',
      message: error?.message || 'Unknown error',
      details: String(error),
      stack: error?.stack,
    });
  }
}

// Para execução local
if (!process.env.VERCEL) {
  bootstrap();
}

