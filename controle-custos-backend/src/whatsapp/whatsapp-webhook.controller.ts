import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { WhatsappBotService } from './whatsapp-bot.service';

export class WhatsappWebhookPayloadDto {
  from: string; // Ex: "+244923000000"
  text?: string;
  mediaUrl?: string;
  type?: string;
}

@Controller('webhooks/whatsapp')
export class WhatsappWebhookController {
  constructor(private readonly whatsappBotService: WhatsappBotService) {}

  // Verificação de Webhook da Meta / BSP
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: any,
  ) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (verifyToken && mode === 'subscribe' && token === verifyToken) {
      return res.status(HttpStatus.OK).send(challenge);
    }
    return res.status(HttpStatus.FORBIDDEN).send('Forbidden');
  }

  // Recebimento de mensagens do webhook
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleIncomingMessage(@Body() body: any) {
    console.log('[WHATSAPP WEBHOOK RECEIVED]:', JSON.stringify(body));

    try {
      let from: string | undefined = body.from;
      let text: string | undefined = body.text;

      // 1. Suporte para Evolution API v1 e v2
      if (
        body?.event === 'messages.upsert' ||
        body?.event === 'MESSAGES_UPSERT' ||
        body?.event === 'messages.update' ||
        body?.data?.message ||
        body?.data?.key
      ) {
        const msgData = body?.data;
        const key = msgData?.key || body?.key;
        if (key?.fromMe) {
          return { status: 'ignored_own_message' };
        }

        // Prioridade total para o número de telefone real: key.remoteJidAlt ou remoteJid
        let cleanedFrom: string | undefined;
        if (key?.remoteJidAlt) {
          cleanedFrom = String(key.remoteJidAlt).replace('@s.whatsapp.net', '').replace(/:\d+/, '').replace(/[^0-9]/g, '');
        } else if (msgData?.remoteJidAlt) {
          cleanedFrom = String(msgData.remoteJidAlt).replace('@s.whatsapp.net', '').replace(/:\d+/, '').replace(/[^0-9]/g, '');
        } else if (msgData?.senderPn) {
          cleanedFrom = String(msgData.senderPn).replace(/[^0-9]/g, '');
        } else {
          const remoteJid = key?.remoteJid || msgData?.remoteJid || msgData?.sender || body?.sender;
          cleanedFrom = remoteJid ? String(remoteJid).replace('@s.whatsapp.net', '').replace('@lid', '').replace(/:\d+/, '').replace(/[^0-9]/g, '') : undefined;
        }
        from = cleanedFrom;
        
        const m = msgData?.message || body?.message;
        text =
          m?.conversation ||
          m?.extendedTextMessage?.text ||
          m?.buttonsResponseMessage?.selectedButtonId ||
          m?.listResponseMessage?.title ||
          m?.imageMessage?.caption ||
          m?.videoMessage?.caption ||
          msgData?.body ||
          body?.body;
      }

      // 2. Suporte para Cloud API da Meta (WhatsApp Business Cloud API)
      if (!text && body?.entry && Array.isArray(body.entry)) {
        for (const entryItem of body.entry) {
          if (entryItem?.changes && Array.isArray(entryItem.changes)) {
            for (const change of entryItem.changes) {
              const messages = change?.value?.messages;
              if (messages && Array.isArray(messages) && messages.length > 0) {
                const msg = messages[0];
                from = msg.from;
                if (msg.type === 'text' && msg.text?.body) {
                  text = msg.text.body;
                } else if (msg.type === 'button' && msg.button?.text) {
                  text = msg.button.text;
                } else if (msg.type === 'interactive') {
                  text =
                    msg.interactive?.button_reply?.title ||
                    msg.interactive?.list_reply?.title ||
                    msg.interactive?.button_reply?.id;
                }
              }
            }
          }
        }
      }

      console.log(`[WHATSAPP PARSED]: from="${from}", text="${text}"`);

      if (!from || !text) {
        return { status: 'ignored_or_no_text', received: Boolean(body) };
      }

      const reply = await this.whatsappBotService.processIncomingMessage(from, text);
      return {
        status: 'processed',
        reply,
      };
    } catch (err: any) {
      console.error('[WHATSAPP WEBHOOK ERROR]:', err?.message, err?.stack);
      return {
        status: 'error',
        error: err?.message,
      };
    }
  }

}
