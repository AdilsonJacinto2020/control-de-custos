import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversaWhatsapp } from './entities/conversa-whatsapp.entity';
import { MensagemProcessada } from './entities/mensagem-processada.entity';
import { WhatsappParserService } from './parser/whatsapp-parser.service';
import { WhatsappBotService } from './whatsapp-bot.service';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { CategoriasModule } from '../categorias/categorias.module';
import { ContasModule } from '../contas/contas.module';
import { TransacoesModule } from '../transacoes/transacoes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversaWhatsapp, MensagemProcessada]),
    UsuariosModule,
    CategoriasModule,
    ContasModule,
    TransacoesModule,
  ],
  controllers: [WhatsappWebhookController],
  providers: [WhatsappParserService, WhatsappBotService],
  exports: [WhatsappBotService, WhatsappParserService],
})
export class WhatsappModule {}
