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
    // Suporta payload direto simples (ex: { from: "+244923...", text: "Almoco 3500 kz" })
    // ou payload padrão completo da Cloud API da Meta (WhatsApp Business Cloud API)
    let from: string | undefined = body.from;
    let text: string | undefined = body.text;

    // 1. Suporte para Evolution API v1 e v2 (Webhook event: MESSAGES_UPSERT ou SEND_MESSAGE)
    if (body?.event === 'messages.upsert' || body?.event === 'MESSAGES_UPSERT' || body?.data?.message) {
      const msgData = body?.data;
      const key = msgData?.key;
      // Ignora mensagens enviadas pelo próprio bot
      if (key?.fromMe) {
        return { status: 'ignored_own_message' };
      }

      from = key?.remoteJid?.replace('@s.whatsapp.net', '') || msgData?.sender;
      text =
        msgData?.message?.conversation ||
        msgData?.message?.extendedTextMessage?.text ||
        msgData?.message?.buttonsResponseMessage?.selectedButtonId ||
        msgData?.message?.listResponseMessage?.title;
    }

    // 2. Suporte para Cloud API da Meta (WhatsApp Business Cloud API)
    if (!text && body?.entry && body?.entry[0]?.changes && body?.entry[0]?.changes[0]?.value?.messages) {
      const msg = body.entry[0].changes[0].value.messages[0];
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


    if (!from || !text) {
      return { status: 'ignored_or_no_text' };
    }

    const reply = await this.whatsappBotService.processIncomingMessage(from, text);
    return {
      status: 'processed',
      reply,
    };
  }

}
