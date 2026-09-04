import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversaWhatsapp, EstadoConversa } from './entities/conversa-whatsapp.entity';
import { MensagemProcessada, TipoConteudoMensagem } from './entities/mensagem-processada.entity';
import { WhatsappParserService } from './parser/whatsapp-parser.service';
import { CategoriasService } from '../categorias/categorias.service';
import { ContasService } from '../contas/contas.service';
import { TransacoesService } from '../transacoes/transacoes.service';
import { OrigemTransacao, TipoTransacao } from '../transacoes/transacao.entity';
import { UsuariosService } from '../usuarios/usuarios.service';

@Injectable()
export class WhatsappBotService {
  private readonly logger = new Logger(WhatsappBotService.name);

  constructor(
    @InjectRepository(ConversaWhatsapp)
    private readonly conversaRepository: Repository<ConversaWhatsapp>,
    @InjectRepository(MensagemProcessada)
    private readonly mensagemRepository: Repository<MensagemProcessada>,
    private readonly usuariosService: UsuariosService,
    private readonly parserService: WhatsappParserService,
    private readonly categoriasService: CategoriasService,
    private readonly contasService: ContasService,
    private readonly transacoesService: TransacoesService,
    private readonly configService: ConfigService,
  ) {}

  async processIncomingMessage(telefone: string, texto: string): Promise<string> {
    // 1. Localizar ou criar utilizador e conversa
    let user = await this.usuariosService.findByWhatsapp(telefone);
    if (!user) {
      // Criação rápida de usuário via WhatsApp
      user = await this.usuariosService.findOrCreateFromGoogle({
        googleId: `whatsapp_${telefone}`,
        nome: `Usuário ${telefone.slice(-4)}`,
      });
      user.telefoneWhatsapp = telefone;
      // Atualiza usuário com telefone
    }

    let conversa = await this.conversaRepository.findOne({
      where: { telefoneWhatsapp: telefone },
    });

    if (!conversa) {
      conversa = this.conversaRepository.create({
        telefoneWhatsapp: telefone,
        usuarioId: user.id,
        estado: EstadoConversa.IDLE,
      });
      conversa = await this.conversaRepository.save(conversa);
    }

    // Registrar auditoria
    const msgLog = this.mensagemRepository.create({
      conversaId: conversa.id,
      tipoConteudo: TipoConteudoMensagem.TEXTO,
      conteudoBruto: texto,
    });

    const resposta = await this.handleState(conversa, user.id, texto, msgLog);

    await this.mensagemRepository.save(msgLog);
    return resposta;
  }

  private async handleState(
    conversa: ConversaWhatsapp,
    usuarioId: string,
    texto: string,
    msgLog: MensagemProcessada,
  ): Promise<string> {
    const raw = texto.trim().toLowerCase();

    // Comando Desfazer / Errado
    if (raw === 'errado' || raw === 'desfazer' || raw === 'apagar') {
      if (conversa.ultimaTransacaoId) {
        try {
          await this.transacoesService.remove(conversa.ultimaTransacaoId, usuarioId);
          conversa.ultimaTransacaoId = null as any;
          conversa.estado = EstadoConversa.IDLE;
          await this.conversaRepository.save(conversa);
          return '🗑️ O último lançamento foi cancelado com sucesso!';
        } catch {
          return '⚠️ Não foi possível cancelar o lançamento anterior.';
        }
      } else {
        return 'ℹ️ Não há nenhum lançamento recente para cancelar.';
      }
    }

    // Se estiver aguardando escolha de categoria por número
    if (conversa.estado === EstadoConversa.AGUARDANDO_CORRECAO_CATEGORIA && conversa.dadosRascunho) {
      const idx = parseInt(raw, 10);
      const opcoes = conversa.dadosRascunho.opcoesCategoria || [];
      if (!isNaN(idx) && idx >= 1 && idx <= opcoes.length) {
        const catEscolhida = opcoes[idx - 1];
        conversa.dadosRascunho.categoriaId = catEscolhida.id;
        conversa.dadosRascunho.confianca = 1.0;

        // Persiste a transação com nome da categoria
        const resposta = await this.finalizarTransacao(conversa, usuarioId, msgLog, undefined, catEscolhida.nome);
        return resposta;
      }
    }

    // Fluxo Normal de Parsing de Texto
    const categorias = await this.categoriasService.findAll(usuarioId);
    const parsed = this.parserService.parseTexto(texto, categorias);
    msgLog.resultadoParsing = parsed as any;

    if (!parsed.valor) {
      return '❓ Não consegui identificar o valor. Por exemplo: "Gastei 5000 kz em táxi" ou "Recebi 50000 kz".';
    }

    // Obter conta principal do utilizador
    const contas = await this.contasService.findAll(usuarioId);
    const contaPrincipal = contas[0];

    conversa.dadosRascunho = {
      valor: parsed.valor,
      moeda: parsed.moeda,
      tipo: parsed.tipo,
      categoriaId: parsed.categoriaId,
      descricao: parsed.descricao,
      data: parsed.data,
      confianca: parsed.confianca,
    };

    // Se for receita e não tiver categoria de despesa, salva diretamente
    if (parsed.tipo === TipoTransacao.RECEITA && !parsed.categoriaId) {
      return this.finalizarTransacao(conversa, usuarioId, msgLog, contaPrincipal.id, 'Receita');
    }

    // Caso de despesa com categoria ambígua / não identificada
    if (!parsed.categoriaId && categorias.length > 0) {
      const topCategorias = categorias.slice(0, 4);
      conversa.dadosRascunho.opcoesCategoria = topCategorias.map((c) => ({
        id: c.id,
        nome: c.nome,
      }));
      conversa.estado = EstadoConversa.AGUARDANDO_CORRECAO_CATEGORIA;
      await this.conversaRepository.save(conversa);

      const lista = topCategorias
        .map((c, i) => `${i + 1}) ${c.nome}`)
        .join('\n');
      return `Em qual categoria fica o gasto de ${parsed.valor} ${parsed.moeda}?\n${lista}\n\nResponda com o número correspondente.`;
    }

    return this.finalizarTransacao(conversa, usuarioId, msgLog, contaPrincipal.id, parsed.categoriaNome);
  }

  private async finalizarTransacao(
    conversa: ConversaWhatsapp,
    usuarioId: string,
    msgLog: MensagemProcessada,
    contaIdOverride?: string,
    categoriaNomeOverride?: string,
  ): Promise<string> {
    const rascunho = conversa.dadosRascunho;
    if (!rascunho || !rascunho.valor) {
      conversa.estado = EstadoConversa.IDLE;
      await this.conversaRepository.save(conversa);
      return '⚠️ Ocorreu um erro no rascunho. Por favor, envie novamente.';
    }

    const contas = await this.contasService.findAll(usuarioId);
    const contaId = contaIdOverride || contas[0]?.id;

    const transacao = await this.transacoesService.create(
      {
        contaId,
        tipo: (rascunho.tipo as TipoTransacao) || TipoTransacao.DESPESA,
        valor: rascunho.valor,
        descricao: rascunho.descricao || 'WhatsApp',
        data: rascunho.data || new Date().toISOString().slice(0, 10),
        categoriaId: rascunho.categoriaId,
        origem: OrigemTransacao.WHATSAPP,
      },
      usuarioId,
    );

    msgLog.transacaoGeradaId = transacao.id;
    conversa.ultimaTransacaoId = transacao.id;
    conversa.estado = EstadoConversa.IDLE;
    conversa.dadosRascunho = null as any;
    conversa.ultimaInteracaoEm = new Date();
    await this.conversaRepository.save(conversa);

    const catTexto = categoriaNomeOverride ? ` em *${categoriaNomeOverride}*` : '';
    const tipoTexto = transacao.tipo === TipoTransacao.RECEITA ? 'Receita recebida' : 'Gasto registado';

    const respostaFinal = `✅ *${tipoTexto}*: ${transacao.valor} ${transacao.moeda}${catTexto}.\n_(Responda "errado" se quiser desfazer)_`;

    // Enviar mensagem ativa via Meta Cloud API se configurado
    await this.sendMetaWhatsappMessage(conversa.telefoneWhatsapp, respostaFinal);

    return respostaFinal;
  }

  /**
   * Envia uma mensagem de texto ativa de volta para o utilizador via Meta WhatsApp Cloud API
   */
  async sendMetaWhatsappMessage(toPhone: string, messageText: string): Promise<boolean> {
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

    if (!phoneNumberId || !accessToken) {
      this.logger.debug('Credenciais da Meta Cloud API não encontradas; pulando envio de mensagem ativa.');
      return false;
    }

    try {
      // Limpa caracteres especiais do telefone para formato internacional limpo
      const cleanedPhone = toPhone.replace(/[^0-9]/g, '');

      const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanedPhone,
          type: 'text',
          text: { body: messageText },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        this.logger.warn(`Erro ao enviar mensagem via WhatsApp Cloud API: ${JSON.stringify(errorData)}`);
        return false;
      }

      this.logger.log(`Mensagem de resposta enviada com sucesso para ${cleanedPhone}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Exceção ao enviar resposta WhatsApp Cloud API: ${err?.message}`);
      return false;
    }
  }
}
