import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappBotService } from './whatsapp-bot.service';

/**
 * Serviço de polling activo da Evolution API.
 *
 * Problema: A Evolution API v2.3.7 com addressingMode "lid" não dispara
 * MESSAGES_UPSERT para webhooks externos. As mensagens chegam à Evolution
 * mas o evento nunca chega à Vercel.
 *
 * Solução: Este serviço vai buscar as mensagens novas directamente à
 * Evolution API via /chat/findMessages, processa-as e envia respostas.
 * É chamado pelo endpoint /api/poll-messages que o cron job pinga.
 */
@Injectable()
export class WhatsappPollerService {
  private readonly logger = new Logger(WhatsappPollerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly botService: WhatsappBotService,
  ) {}

  async pollAndProcess(): Promise<{ processed: number; errors: number; lastId: string | null }> {
    const evolutionUrl = this.configService.get<string>('EVOLUTION_API_URL');
    const evolutionApiKey = this.configService.get<string>('EVOLUTION_API_KEY');
    const evolutionInstance = this.configService.get<string>('EVOLUTION_INSTANCE_NAME') || 'fincontrol';

    if (!evolutionUrl || !evolutionApiKey) {
      this.logger.warn('[POLLER] EVOLUTION_API_URL ou EVOLUTION_API_KEY não configurados');
      return { processed: 0, errors: 0, lastId: null };
    }

    const cleanUrl = evolutionUrl.replace(/\/+$/, '');
    const { Client } = await import('pg');
    const client = new Client({
      connectionString: this.configService.get<string>('DATABASE_URL'),
      ssl: { rejectUnauthorized: false },
    });

    let lastProcessedAt: Date | null = null;

    try {
      await client.connect();
      await client.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_poller_state (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      const stateResult = await client.query(
        `SELECT value FROM whatsapp_poller_state WHERE key = 'last_processed_message_at'`
      );
      if (stateResult.rows.length > 0) {
        lastProcessedAt = new Date(stateResult.rows[0].value);
      }
    } catch (err: any) {
      this.logger.error(`[POLLER] Erro ao ler estado: ${err?.message}`);
    }

    // Buscar mensagens desde a última processada (com 5s de overlap) ou últimos 2 minutos
    const sinceDate = lastProcessedAt
      ? new Date(lastProcessedAt.getTime() - 5000)
      : new Date(Date.now() - 2 * 60 * 1000);

    this.logger.log(`[POLLER] A buscar mensagens desde ${sinceDate.toISOString()}`);

    let processed = 0;
    let errors = 0;
    let newestTimestamp: Date | null = null;
    let newestId: string | null = null;

    try {
      const endpoint = `${cleanUrl}/chat/findMessages/${evolutionInstance}`;
      const response = await fetch(endpoint, {
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

      if (!response.ok) {
        this.logger.warn(`[POLLER] Evolution API respondeu ${response.status}`);
        await client.end().catch(() => {});
        return { processed: 0, errors: 1, lastId: null };
      }

      const data = await response.json();
      const mensagens: any[] = data?.messages?.records || data?.records || [];
      this.logger.log(`[POLLER] Encontradas ${mensagens.length} mensagens desde ${sinceDate.toISOString()}`);

      // Ordenar por timestamp crescente para processar na ordem certa
      mensagens.sort((a, b) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0));

      for (const msg of mensagens) {
        const msgId = msg.id || msg.key?.id;
        const msgTimestamp = msg.messageTimestamp ? new Date(msg.messageTimestamp * 1000) : null;

        if (lastProcessedAt && msgTimestamp && msgTimestamp <= lastProcessedAt) {
          continue; // Já processada
        }

        const key = msg.key;
        let telefone: string | null = null;
        if (key?.remoteJidAlt) {
          telefone = String(key.remoteJidAlt).replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
        } else if (key?.remoteJid && !key.remoteJid.includes('@lid')) {
          telefone = String(key.remoteJid).replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
        }

        const message = msg.message;
        const texto: string | null =
          message?.conversation ||
          message?.extendedTextMessage?.text ||
          message?.imageMessage?.caption ||
          null;

        if (!telefone || !texto) {
          this.logger.debug(`[POLLER] Sem telefone (${telefone}) ou texto (${texto}), a saltar`);
          continue;
        }

        this.logger.log(`[POLLER] Processando: tel="${telefone}", txt="${texto}", id="${msgId}"`);

        try {
          await this.botService.processIncomingMessage(telefone, texto);
          processed++;
          if (!newestTimestamp || (msgTimestamp && msgTimestamp > newestTimestamp)) {
            newestTimestamp = msgTimestamp;
            newestId = msgId;
          }
        } catch (err: any) {
          this.logger.error(`[POLLER] Erro ao processar ${msgId}: ${err?.message}`);
          errors++;
        }
      }

      if (newestTimestamp) {
        await client.query(`
          INSERT INTO whatsapp_poller_state (key, value, updated_at)
          VALUES ('last_processed_message_at', $1, NOW())
          ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
        `, [newestTimestamp.toISOString()]);
      }

    } catch (err: any) {
      this.logger.error(`[POLLER] Erro geral: ${err?.message}`);
      errors++;
    } finally {
      await client.end().catch(() => {});
    }

    return { processed, errors, lastId: newestId };
  }
}
