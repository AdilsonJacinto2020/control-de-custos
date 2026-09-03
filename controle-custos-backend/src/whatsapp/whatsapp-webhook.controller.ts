import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
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
  ) {
    if (mode === 'subscribe' && token === (process.env.WHATSAPP_VERIFY_TOKEN || 'fincontrol_token')) {
      return challenge;
    }
    return 'Forbidden';
  }

  // Recebimento de mensagens do webhook
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleIncomingMessage(@Body() body: any) {
    // Suporta payload direto simples ou payload padrão da Cloud API da Meta
    let from = body.from;
    let text = body.text;

    if (body.entry && body.entry[0]?.changes && body.entry[0]?.changes[0]?.value?.messages) {
      const msg = body.entry[0].changes[0].value.messages[0];
      from = msg.from;
      text = msg.text?.body;
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
