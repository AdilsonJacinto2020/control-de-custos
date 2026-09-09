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
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'fincontrol_token';
    if (mode === 'subscribe' && token === verifyToken) {
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

    try {
      const entry = body?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (message) {
        from = message.from;
        if (message.type === 'text' && message.text?.body) {
          text = message.text.body;
        } else if (message.type === 'button' && message.button?.text) {
          text = message.button.text;
        } else if (message.type === 'interactive') {
          text =
            message.interactive?.button_reply?.title ||
            message.interactive?.list_reply?.title ||
            message.interactive?.button_reply?.id;
        }
      }
    } catch {
      // payload simples de fallback
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
