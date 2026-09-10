import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { WhatsappBotService } from './whatsapp/whatsapp-bot.service';
import express, { Express } from 'express';

const server: Express = express();
let nestAppInstance: any = null;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  nestAppInstance = app;
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

let isInitialized = false;

// Helper: gravar/ler webhooks na BD (funciona em serverless — sem memória partilhada)
async function saveWebhookLog(payload: any, headers: any) {
  try {
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();
    // Criar tabela se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_debug_logs (
        id SERIAL PRIMARY KEY,
        received_at TIMESTAMPTZ DEFAULT NOW(),
        body JSONB,
        headers JSONB
      )
    `);
    await client.query(
      `INSERT INTO webhook_debug_logs (body, headers) VALUES ($1, $2)`,
      [JSON.stringify(payload), JSON.stringify(headers)]
    );
    // Manter apenas os últimos 20 registos
    await client.query(`
      DELETE FROM webhook_debug_logs
      WHERE id NOT IN (SELECT id FROM webhook_debug_logs ORDER BY received_at DESC LIMIT 20)
    `);
    await client.end();
  } catch (e) {
    // Ignorar erros de log — não afecta o processamento principal
    console.error('[WEBHOOK_LOG] Erro ao gravar log:', (e as any)?.message);
  }
}

async function readWebhookLogs() {
  try {
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const result = await client.query(`
      SELECT received_at as timestamp, body, headers
      FROM webhook_debug_logs
      ORDER BY received_at DESC
      LIMIT 20
    `);
    await client.end();
    return result.rows.map(r => {
      const body = r.body;
      // Extrai campos legíveis do payload Evolution API
      let evento = body?.event || '(desconhecido)';
      let telefone: string | null = null;
      let mensagem: string | null = null;
      let direcao: string | null = null;

      const data = body?.data;
      const key = data?.key || body?.key;

      // Telefone
      if (key?.remoteJidAlt) {
        telefone = String(key.remoteJidAlt).replace('@s.whatsapp.net', '');
      } else if (data?.remoteJidAlt) {
        telefone = String(data.remoteJidAlt).replace('@s.whatsapp.net', '');
      } else if (key?.remoteJid) {
        telefone = String(key.remoteJid).replace('@s.whatsapp.net', '').replace('@lid', '');
      } else if (body?.sender) {
        telefone = String(body.sender).replace('@s.whatsapp.net', '');
      }

      // Mensagem de texto
      const msg = data?.message || body?.message;
      if (msg) {
        mensagem =
          msg.conversation ||
          msg.extendedTextMessage?.text ||
          msg.imageMessage?.caption ||
          '(media/outro tipo)';
      }

      // Direcção
      if (key?.fromMe === true) direcao = '⬆️ enviada pelo bot';
      else if (key?.fromMe === false) direcao = '⬇️ recebida do utilizador';

      return {
        timestamp: r.timestamp,
        resumo: {
          evento,
          telefone,
          mensagem,
          direcao,
        },
        body,
        headers: r.headers,
      };
    });
  } catch (e) {
    return [];
  }
}

// Handler para Vercel Serverless Function
export default async function handler(req: any, res: any) {
  // Capture webhook requests directly at Vercel edge — grava na BD para persistir entre invocações
  if (req.method === 'POST' && (req.url === '/webhooks/whatsapp' || req.url?.startsWith('/webhooks/whatsapp'))) {
    const rawPayload = req.body;
    // Fire-and-forget: não bloqueia o processamento principal
    saveWebhookLog(rawPayload, {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
    });
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

  // Endpoint de diagnóstico para inspecionar webhooks recebidos em tempo real (lê da BD)
  if (reqUrl.startsWith('/api/live-webhooks') || reqUrl.startsWith('/live-webhooks')) {
    const debugKey = process.env.DEBUG_KEY;
    if (!debugKey || req.query?.key !== debugKey) {
      return res.status(404).json({ statusCode: 404, message: 'Cannot GET ' + reqUrl });
    }
    const logs = await readWebhookLogs();
    return res.status(200).json({
      total: logs.length,
      logs,
      note: 'Dados persistidos na BD — funciona entre invocações serverless',
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

  // Endpoint de diagnóstico para ver utilizadores e estado de vinculação WhatsApp
  if (reqUrl.startsWith('/api/debug-users') || reqUrl.startsWith('/debug-users')) {
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
      const result = await client.query(`
        SELECT 
          id, nome, email, 
          "telefoneWhatsapp",
          "codigoVinculacaoWhatsapp",
          "codigoVinculacaoExpiraEm",
          CASE WHEN "codigoVinculacaoExpiraEm" > NOW() THEN 'VALID' ELSE 'EXPIRED' END AS "codigoStatus",
          "criadoEm"
        FROM usuarios 
        ORDER BY "criadoEm" DESC 
        LIMIT 20
      `);
      const conversas = await client.query(`
        SELECT "telefoneWhatsapp", estado, "ultimaInteracaoEm"
        FROM conversas_whatsapp
        ORDER BY "ultimaInteracaoEm" DESC
        LIMIT 10
      `).catch(() => ({ rows: [] }));
      await client.end();
      return res.status(200).json({
        usuarios: result.rows,
        conversas: conversas.rows,
        serverTime: new Date().toISOString(),
      });
    } catch (dbErr: any) {
      return res.status(500).json({
        status: 'db_query_failed',
        error: dbErr?.message,
      });
    }
  }

  // Endpoint de polling activo da Evolution API — contorna bug MESSAGES_UPSERT com LID
  // Chamado pelo cron job a cada minuto: GET /api/poll-messages?key=DEBUG_KEY
  if (reqUrl.startsWith('/api/poll-messages') || reqUrl.startsWith('/poll-messages')) {
    const debugKey = process.env.DEBUG_KEY;
    if (!debugKey || req.query?.key !== debugKey) {
      return res.status(404).json({ statusCode: 404, message: 'Cannot GET ' + reqUrl });
    }

    try {
      const evolutionUrl = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
      const evolutionApiKey = process.env.EVOLUTION_API_KEY || '';
      const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME || 'fincontrol';

      if (!evolutionUrl || !evolutionApiKey) {
        return res.status(200).json({ status: 'skipped', reason: 'EVOLUTION_API_URL ou EVOLUTION_API_KEY em falta' });
      }

      // Ler último timestamp processado da BD
      const { Client } = await import('pg');
      const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      await client.connect();
      await client.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_poller_state (
          key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      const stateRow = await client.query(
        `SELECT value FROM whatsapp_poller_state WHERE key = 'last_processed_message_at'`
      );
      const lastProcessedAt = stateRow.rows.length > 0 ? new Date(stateRow.rows[0].value) : null;
      const sinceDate = lastProcessedAt
        ? new Date(lastProcessedAt.getTime() - 5000)
        : new Date(Date.now() - 2 * 60 * 1000);

      // Buscar mensagens novas na Evolution API
      const evResp = await fetch(`${evolutionUrl}/chat/findMessages/${evolutionInstance}`, {
        method: 'POST',
        headers: { 'apikey': evolutionApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          where: {
            key: { fromMe: false },
            messageTimestamp: { gte: Math.floor(sinceDate.getTime() / 1000) },
          },
          limit: 20,
        }),
      });

      const evData = await evResp.json().catch(() => ({}));
      const mensagens: any[] = (evData?.messages?.records || evData?.records || [])
        .sort((a: any, b: any) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0));

      console.log(`[POLL] Encontradas ${mensagens.length} mensagens desde ${sinceDate.toISOString()}`);

      let processed = 0;
      let skipped = 0;
      let newestTimestamp: Date | null = null;
      const log: any[] = [];

      for (const msg of mensagens) {
        const msgTimestamp = msg.messageTimestamp ? new Date(msg.messageTimestamp * 1000) : null;
        if (lastProcessedAt && msgTimestamp && msgTimestamp <= lastProcessedAt) { skipped++; continue; }

        const key = msg.key;
        let telefone: string | null = null;
        if (key?.remoteJidAlt) {
          telefone = String(key.remoteJidAlt).replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
        } else if (key?.remoteJid && !key.remoteJid.includes('@lid')) {
          telefone = String(key.remoteJid).replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
        }
        const message = msg.message;
        const texto: string | null = message?.conversation || message?.extendedTextMessage?.text || null;

        const logEntry = { id: msg.id, tel: telefone, txt: texto, ts: msgTimestamp?.toISOString() };
        log.push(logEntry);
        console.log('[POLL] Mensagem:', JSON.stringify(logEntry));

        if (!telefone || !texto) { skipped++; continue; }

        try {
          if (!isInitialized) { await bootstrap(); isInitialized = true; }

          const botService = nestAppInstance?.get(WhatsappBotService);

          if (botService) {
            console.log(`[POLL] Invocando botService.processIncomingMessage('${telefone}', '${texto}')`);
            const botReply = await botService.processIncomingMessage(telefone, texto);
            console.log(`[POLL] Resposta do bot gerada:`, botReply);
            processed++;
          } else {
            console.warn('[POLL] WhatsappBotService não encontrado no container NestJS');
          }

          if (!newestTimestamp || (msgTimestamp && msgTimestamp > newestTimestamp)) {
            newestTimestamp = msgTimestamp;
          }
        } catch (err: any) {
          console.error('[POLL] Erro ao processar:', err?.message, err?.stack);
        }
      }

      // Guardar novo timestamp
      if (newestTimestamp) {
        await client.query(`
          INSERT INTO whatsapp_poller_state (key, value, updated_at) VALUES ('last_processed_message_at', $1, NOW())
          ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
        `, [newestTimestamp.toISOString()]);
      }
      await client.end().catch(() => {});

      return res.status(200).json({
        status: 'ok',
        since: sinceDate.toISOString(),
        found: mensagens.length,
        processed,
        skipped,
        log,
        polledAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[POLL] Erro geral:', err?.message);
      return res.status(500).json({ status: 'error', error: err?.message });
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

