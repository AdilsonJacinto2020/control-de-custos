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
    // Manter os últimos 50 registos
    await client.query(`
      DELETE FROM webhook_debug_logs
      WHERE id NOT IN (SELECT id FROM webhook_debug_logs ORDER BY received_at DESC LIMIT 50)
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
      LIMIT 50
    `);
    await client.end();
    return result.rows.map(r => {
      const body = r.body;
      const evento = body?.event || '(desconhecido)';
      let telefone: string | null = null;
      let mensagem: string | null = null;
      let direcao: string = 'ℹ️ evento';
      let categoria: 'cliente' | 'bot' | 'presenca' | 'sistema' = 'sistema';

      const data = body?.data;
      const key = data?.key || body?.key;

      if (evento === 'presence.update') {
        categoria = 'presenca';
        const presenceId = data?.id || Object.keys(data?.presences || {})[0] || '';
        telefone = String(presenceId).replace('@s.whatsapp.net', '').replace('@lid', ' (LID)');
        const presenceStatus = data?.presences?.[presenceId]?.lastKnownPresence || data?.lastKnownPresence || 'ativo';
        mensagem = presenceStatus === 'composing' ? '✍️ Cliente a digitar no WhatsApp...' : `Presença: ${presenceStatus}`;
        direcao = '✍️ atividade do utilizador';
      } else if (
        evento === 'contacts.update' ||
        evento === 'contacts.upsert' ||
        evento === 'chats.update' ||
        evento === 'chats.set' ||
        evento === 'chats.upsert' ||
        evento === 'labels.edit' ||
        evento === 'connection.update' ||
        evento === 'qrcode.updated' ||
        evento === 'messages.set' ||
        evento === 'messages.edited'
      ) {
        categoria = 'sistema';
        const item = Array.isArray(data) ? data[0] : data;
        const jid = item?.remoteJid || item?.id || '';
        telefone = jid ? String(jid).replace('@s.whatsapp.net', '').replace('@lid', ' (LID)') : '(sistema)';
        mensagem = `Evento interno Baileys/Evolution: ${evento}`;
        direcao = '⚙️ Sincronização de background';
      } else if (evento === 'send.message' || key?.fromMe === true) {
        categoria = 'bot';
        direcao = '⬆️ enviada pelo bot';
        telefone = key?.remoteJid ? String(key.remoteJid).replace('@s.whatsapp.net', '') : null;
        const msg = data?.message || body?.message;
        mensagem = msg?.conversation || msg?.extendedTextMessage?.text || (typeof msg === 'string' ? msg : JSON.stringify(msg));
      } else if (evento === 'messages.upsert' || evento === 'MESSAGES_UPSERT') {
        categoria = 'cliente';
        direcao = '⬇️ recebida do utilizador';
        if (key?.remoteJidAlt) {
          telefone = String(key.remoteJidAlt).replace('@s.whatsapp.net', '');
        } else if (data?.remoteJidAlt) {
          telefone = String(data.remoteJidAlt).replace('@s.whatsapp.net', '');
        } else if (key?.remoteJid) {
          telefone = String(key.remoteJid).replace('@s.whatsapp.net', '').replace('@lid', ' (LID)');
        }
        const msg = data?.message || body?.message;
        mensagem =
          msg?.conversation ||
          msg?.extendedTextMessage?.text ||
          msg?.buttonsResponseMessage?.selectedButtonId ||
          msg?.listResponseMessage?.title ||
          msg?.imageMessage?.caption ||
          msg?.videoMessage?.caption ||
          data?.body ||
          body?.body ||
          '(sem texto)';
      } else {
        categoria = 'sistema';
        direcao = `ℹ️ ${evento}`;
        mensagem = `Evento não categorizado: ${evento}`;
      }

      return {
        timestamp: r.timestamp,
        resumo: {
          evento,
          categoria,
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

    // Buscar também as mensagens salvas diretamente na Evolution API
    let evolutionMessages: any[] = [];
    try {
      const evUrl = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
      const evKey = process.env.EVOLUTION_API_KEY || '';
      const evInst = process.env.EVOLUTION_INSTANCE_NAME || 'fincontrol_bot';
      if (evUrl && evKey) {
        const evRes = await fetch(`${evUrl}/chat/findMessages/${evInst}`, {
          method: 'POST',
          headers: { apikey: evKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 10 }),
        });
        if (evRes.ok) {
          const evData = await evRes.json().catch(() => ({}));
          const recs: any[] = evData?.messages?.records || evData?.records || [];
          evolutionMessages = recs.map((m: any) => ({
            id: m.id || m.key?.id,
            fromMe: m.key?.fromMe ?? m.fromMe,
            direcao: (m.key?.fromMe ?? m.fromMe) ? '⬆️ Bot' : '⬇️ Cliente',
            telefone: m.key?.remoteJidAlt ? String(m.key.remoteJidAlt).replace('@s.whatsapp.net', '') : String(m.key?.remoteJid || '').replace('@s.whatsapp.net', '').replace('@lid', ' (LID)'),
            texto: m.message?.conversation || m.message?.extendedTextMessage?.text || '(sem texto)',
            timestamp: m.messageTimestamp ? new Date(m.messageTimestamp * 1000).toISOString() : null,
          }));
        }
      }
    } catch (e) {}

    const total = logs.length;
    const mensagensCliente = logs.filter(l => l.resumo.categoria === 'cliente');
    const atividadeCliente = logs.filter(l => l.resumo.categoria === 'presenca');
    const mensagensBot = logs.filter(l => l.resumo.categoria === 'bot');

    const wantsHtml = req.query?.format !== 'json' && (req.headers?.accept?.includes('text/html') || !req.query?.format);

    if (wantsHtml) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FinControl — Painel Live Webhooks</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0f172a; color: #f8fafc; margin: 0; padding: 24px 16px; }
    .container { max-width: 1000px; margin: 0 auto; }
    header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 24px; gap: 12px; }
    h1 { margin: 0; font-size: 22px; display: flex; align-items: center; gap: 8px; }
    .btn { background: #3b82f6; color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .btn:hover { background: #2563eb; }
    .btn-green { background: #10b981; }
    .btn-green:hover { background: #059669; }
    .btn-secondary { background: #334155; color: #cbd5e1; }
    .btn-secondary:hover { background: #475569; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px; }
    .card h3 { margin: 0 0 8px 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
    .card .value { font-size: 26px; font-weight: bold; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .badge-cliente { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
    .badge-bot { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); }
    .badge-presenca { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
    .badge-sistema { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.4); }
    .table-container { background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
    .table-header { padding: 16px; font-size: 15px; font-weight: 600; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 12px 16px; font-size: 12px; color: #94a3b8; text-transform: uppercase; border-bottom: 1px solid #334155; }
    td { padding: 14px 16px; font-size: 13px; border-bottom: 1px solid #243247; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255, 255, 255, 0.02); }
    .message-text { font-family: monospace; font-size: 13px; white-space: pre-wrap; background: #0f172a; padding: 6px 10px; border-radius: 6px; border: 1px solid #334155; margin-top: 4px; }
    .phone-tag { font-family: monospace; color: #38bdf8; }
    .time-tag { color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>⚡ FinControl Live Webhooks</h1>
        <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Monitorização em tempo real de mensagens e eventos do WhatsApp</p>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <a href="/api/poll-messages?key=${debugKey}" class="btn btn-green">⚡ Processar Mensagens Pendentes</a>
        <a href="javascript:location.reload()" class="btn">🔄 Recarregar</a>
        <a href="/api/live-webhooks?key=${debugKey}&format=json" class="btn btn-secondary">Ver JSON</a>
      </div>
    </header>

    <div class="stats">
      <div class="card">
        <h3>📥 Mensagens do Cliente</h3>
        <div class="value" style="color: #34d399;">${mensagensCliente.length}</div>
      </div>
      <div class="card">
        <h3>✍️ Presença / Digitando</h3>
        <div class="value" style="color: #fbbf24;">${atividadeCliente.length}</div>
      </div>
      <div class="card">
        <h3>📤 Respostas do Bot</h3>
        <div class="value" style="color: #60a5fa;">${mensagensBot.length}</div>
      </div>
      <div class="card">
        <h3>📊 Total Eventos na BD</h3>
        <div class="value">${total}</div>
      </div>
    </div>

    <!-- Mensagens salvas na Evolution API -->
    <div class="table-container">
      <div class="table-header">
        <span>📦 Mensagens na Base de Dados da Evolution API (Últimas 10)</span>
        <span style="font-size: 12px; font-weight: normal; color: #94a3b8;">Instância <code>fincontrol</code></span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 130px;">Data/Hora</th>
            <th style="width: 110px;">Direção</th>
            <th style="width: 170px;">Telefone / Origem</th>
            <th>Conteúdo</th>
          </tr>
        </thead>
        <tbody>
          ${evolutionMessages.length === 0 ? '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 24px;">Nenhuma mensagem encontrada na Evolution API.</td></tr>' : evolutionMessages.map(m => `
            <tr>
              <td class="time-tag">${m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : '-'}</td>
              <td><span class="badge ${m.fromMe ? 'badge-bot' : 'badge-cliente'}">${m.direcao}</span></td>
              <td class="phone-tag">${m.telefone || '-'}</td>
              <td><div class="message-text">${m.texto.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Eventos Webhook recebidos na Vercel -->
    <div class="table-container">
      <div class="table-header">
        <span>📡 Eventos de Webhook Recebidos pela Vercel</span>
        <span style="font-size: 12px; font-weight: normal; color: #94a3b8;">Registos gravados em tempo real</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 130px;">Data/Hora</th>
            <th style="width: 140px;">Tipo de Evento</th>
            <th style="width: 170px;">Contacto / Telefone</th>
            <th>Resumo / Mensagem</th>
          </tr>
        </thead>
        <tbody>
          ${logs.length === 0 ? '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 24px;">Nenhum evento gravado até ao momento.</td></tr>' : logs.map(l => `
            <tr>
              <td class="time-tag">${new Date(l.timestamp).toLocaleTimeString()}</td>
              <td><span class="badge badge-${l.resumo.categoria}">${l.resumo.evento}</span></td>
              <td class="phone-tag">${l.resumo.telefone || '(instância)'}</td>
              <td>
                <div style="font-weight: 500; color: #f1f5f9; margin-bottom: 2px;">${l.resumo.direcao}</div>
                ${l.resumo.mensagem ? `<div class="message-text">${l.resumo.mensagem.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
      return res.status(200).send(html);
    }

    return res.status(200).json({
      total,
      estatisticas: {
        mensagensCliente: mensagensCliente.length,
        presencaOuDigitando: atividadeCliente.length,
        mensagensBot: mensagensBot.length,
      },
      evolutionMessages,
      logs,
      note: 'Dados persistidos na BD — use format=html para visualização em página',
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

  // Endpoint de utilidade / diagnóstico para limpar gastos de uma conta (recomeçar ciclo do zero)
  if (reqUrl.startsWith('/api/reset-user-transactions') || reqUrl.startsWith('/reset-user-transactions')) {
    const debugKey = process.env.DEBUG_KEY;
    if (!debugKey || req.query?.key !== debugKey) {
      return res.status(404).json({ statusCode: 404, message: 'Cannot GET ' + reqUrl });
    }

    const email = req.query?.email || 'adijacinto.aj@gmail.com';
    const { Client } = await import('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      const userRes = await client.query(`SELECT id, nome, email FROM usuarios WHERE email = $1`, [email]);
      if (userRes.rows.length === 0) {
        await client.end();
        return res.status(404).json({ status: 'user_not_found', email });
      }

      const userId = userRes.rows[0].id;
      // 1. Apagar mensagens processadas
      await client.query(`DELETE FROM mensagens_processadas WHERE "conversaId" IN (SELECT id FROM conversas_whatsapp WHERE "usuarioId" = $1)`, [userId]).catch(() => {});
      // 2. Apagar transações
      const transDel = await client.query(`DELETE FROM transacoes WHERE "usuarioId" = $1`, [userId]);
      // 3. Resetar saldos das contas para 0
      await client.query(`UPDATE contas SET "saldoAtual" = 0 WHERE "usuarioId" = $1`, [userId]);
      // 4. Resetar estado da conversa de WhatsApp para IDLE
      await client.query(`UPDATE conversas_whatsapp SET estado = 'IDLE', "dadosRascunho" = NULL, "ultimaTransacaoId" = NULL WHERE "usuarioId" = $1`, [userId]).catch(() => {});

      await client.end();
      return res.status(200).json({
        status: 'success',
        user: userRes.rows[0],
        transacoesRemovidas: transDel.rowCount,
        message: `Todas as transações do utilizador ${email} foram apagadas e os saldos foram redefinidos para 0 kz.`,
      });
    } catch (err: any) {
      return res.status(500).json({ status: 'error', error: err?.message });
    }
  }

  // Endpoint de polling da Evolution API — contorna bug MESSAGES_UPSERT com LID da Evolution API
  if (reqUrl.startsWith('/api/poll-messages') || reqUrl.startsWith('/poll-messages')) {
    const debugKey = process.env.DEBUG_KEY;
    if (!debugKey || req.query?.key !== debugKey) {
      return res.status(404).json({ statusCode: 404, message: 'Cannot GET ' + reqUrl });
    }

    try {
      const evolutionUrl = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
      const evolutionApiKey = process.env.EVOLUTION_API_KEY || '';
      const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME || 'fincontrol_bot';

      if (!evolutionUrl || !evolutionApiKey) {
        return res.status(200).json({ status: 'skipped', reason: 'EVOLUTION_API_URL ou EVOLUTION_API_KEY em falta' });
      }

      const { Client } = await import('pg');
      const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      await client.connect();

      await client.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_poller_state (
          key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS whatsapp_processed_ids (
          message_id TEXT PRIMARY KEY,
          telefone TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_whatsapp_processed_ids_created_at ON whatsapp_processed_ids (created_at);
      `);

      // Limpar IDs com mais de 7 dias
      await client.query(`DELETE FROM whatsapp_processed_ids WHERE created_at < NOW() - INTERVAL '7 days'`).catch(() => {});

      const stateRow = await client.query(
        `SELECT value FROM whatsapp_poller_state WHERE key = 'last_processed_message_at'`
      );
      const lastProcessedAt = stateRow.rows.length > 0 ? new Date(stateRow.rows[0].value) : null;
      // Olhar no máximo 15 minutos para trás para apanhar mensagens recentes pendentes
      const quinzeMinutosAtras = new Date(Date.now() - 15 * 60 * 1000);
      const sinceDate = lastProcessedAt && lastProcessedAt > quinzeMinutosAtras
        ? new Date(lastProcessedAt.getTime() - 1000)
        : quinzeMinutosAtras;

      const evResp = await fetch(`${evolutionUrl}/chat/findMessages/${evolutionInstance}`, {
        method: 'POST',
        headers: { 'apikey': evolutionApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: 25,
        }),
      });

      const evData = await evResp.json().catch(() => ({}));
      const rawMensagens: any[] = evData?.messages?.records || evData?.records || [];
      // Filtrar estritamente apenas mensagens do cliente (ignorar mensagens enviadas pelo bot)
      const mensagens: any[] = rawMensagens
        .filter((m: any) => m.key?.fromMe !== true && m.fromMe !== true)
        .sort((a: any, b: any) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0));

      let processed = 0;
      let skipped = 0;
      let newestTimestamp: Date | null = null;
      const log: any[] = [];

      for (const msg of mensagens) {
        const msgId = msg.id || msg.key?.id;
        const msgTimestamp = msg.messageTimestamp ? new Date(msg.messageTimestamp * 1000) : null;

        // Atualizar cursor para o mais recente encontrado
        if (!newestTimestamp || (msgTimestamp && msgTimestamp > newestTimestamp)) {
          newestTimestamp = msgTimestamp;
        }

        // Ignorar se já for mais antiga que o cursor conhecido
        if (lastProcessedAt && msgTimestamp && msgTimestamp <= lastProcessedAt) {
          skipped++;
          continue;
        }

        // Deduplicação estrita: se já processámos este ID de mensagem
        if (msgId) {
          const alreadyProcessed = await client.query(
            `SELECT 1 FROM whatsapp_processed_ids WHERE message_id = $1`,
            [msgId]
          );
          if (alreadyProcessed.rows.length > 0) {
            skipped++;
            continue;
          }
        }

        const key = msg.key;
        let telefone: string | null = null;
        if (key?.remoteJidAlt) {
          telefone = String(key.remoteJidAlt).replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
        } else if (key?.remoteJid && !key.remoteJid.includes('@lid')) {
          telefone = String(key.remoteJid).replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
        }
        const message = msg.message;
        const texto: string | null = message?.conversation || message?.extendedTextMessage?.text || null;

        const logEntry = { id: msgId, tel: telefone, txt: texto, ts: msgTimestamp?.toISOString() };
        log.push(logEntry);

        if (!telefone || !texto) {
          skipped++;
          if (msgId) {
            await client.query(
              `INSERT INTO whatsapp_processed_ids (message_id, telefone) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [msgId, telefone || 'unknown']
            );
          }
          continue;
        }

        // Marcar ID imediatamente para proteger concorrência
        if (msgId) {
          await client.query(
            `INSERT INTO whatsapp_processed_ids (message_id, telefone) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [msgId, telefone]
          );
        }

        try {
          if (!isInitialized) { await bootstrap(); isInitialized = true; }

          const botService = nestAppInstance?.get(WhatsappBotService);

          if (botService) {
            console.log(`[POLL] Processando mensagem: tel='${telefone}', txt='${texto}'`);
            const reply = await botService.processIncomingMessage(telefone, texto);
            console.log(`[POLL] Resposta gerada:`, reply);
            processed++;
          }
        } catch (err: any) {
          console.error('[POLL] Erro ao processar:', err?.message);
        }
      }

      if (newestTimestamp) {
        await client.query(`
          INSERT INTO whatsapp_poller_state (key, value, updated_at) VALUES ('last_processed_message_at', $1, NOW())
          ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
        `, [newestTimestamp.toISOString()]);
      }
      await client.end().catch(() => {});

      return res.status(200).json({
        status: 'ok',
        encontradas: mensagens.length,
        processadas: processed,
        ignoradasOuJaProcessadas: skipped,
        mensagens: log,
        executadoEm: new Date().toISOString(),
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

