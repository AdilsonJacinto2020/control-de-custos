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
import { MetasPoupancaService } from '../metas-poupanca/metas-poupanca.service';

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
    private readonly metasService: MetasPoupancaService,
  ) {}

  async processIncomingMessage(telefone: string, texto: string): Promise<string> {
    // 0. Comando de vinculação a uma conta já existente do site
    // Suporta tanto "vincular 123456" quanto o utilizador enviar diretamente apenas "123456"
    const rawInicial = texto.trim().toLowerCase();
    const matchVinculacao = rawInicial.match(/^(?:vincular\s+)?(\d{6})$/);
    if (matchVinculacao) {
      const codigo = matchVinculacao[1];
      this.logger.log(`[VINCULAR] Tentativa de vinculação: telefone="${telefone}", codigo="${codigo}"`);

      // Verificar se este número já está vinculado a uma conta real (com email = conta Google)
      const jaVinculado = await this.usuariosService.findByWhatsapp(telefone);
      if (jaVinculado && jaVinculado.email) {
        this.logger.log(`[VINCULAR] Número ${telefone} já está vinculado à conta ${jaVinculado.email}`);
        const resposta = `✅ *O seu WhatsApp já está vinculado* à conta *${jaVinculado.nome || jaVinculado.email}*!\n\nNão precisa de fazer mais nada. Pode usar o bot normalmente.\n\nEnvie *oi* para ver o menu ou *saldo* para ver o resumo financeiro.`;
        await this.sendMetaWhatsappMessage(telefone, resposta);
        return resposta;
      }

      const usuarioVinculado = await this.usuariosService.vincularWhatsappPorCodigo(codigo, telefone);
      this.logger.log(`[VINCULAR] Resultado: ${usuarioVinculado ? `vinculado ao utilizador ${usuarioVinculado.id}` : 'FALHOU (código inválido ou expirado)'}`);
      const resposta = usuarioVinculado
        ? '✅ *O seu WhatsApp foi vinculado com sucesso à sua conta do FinControl!*\n\nTodos os lançamentos que fizer por aqui vão aparecer diretamente no seu painel web.\n\nEnvie *oi* para começar a registar os seus gastos.'
        : '⚠️ Código de vinculação inválido ou expirado.\n\nO código é válido por *30 minutos*. Por favor, aceda a *Vincular WhatsApp* no site, gere um novo código e envie aqui *imediatamente*.';
      await this.sendMetaWhatsappMessage(telefone, resposta);
      return resposta;
    }


    // 1. Localizar ou criar utilizador e conversa
    let user = await this.usuariosService.findByWhatsapp(telefone);
    let contaERecemCriada = false;
    if (!user) {
      // IMPORTANTE: isto cria uma conta "só WhatsApp", desconectada de
      // qualquer conta que a pessoa já tenha no site via Google. Isso é
      // aceitável para quem começa a usar o produto pelo WhatsApp — mas
      // é preciso avisar explicitamente, para quem já tem conta no site
      // saber que precisa de vincular em vez de ficar com dados divididos
      // em dois sítios sem se aperceber.
      user = await this.usuariosService.findOrCreateFromGoogle({
        googleId: `whatsapp_${telefone}`,
        nome: `Usuário ${telefone.slice(-4)}`,
      });
      user.telefoneWhatsapp = telefone;
      await this.usuariosService.updateTelefone(user.id, telefone);
      contaERecemCriada = true;
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

    let resposta = await this.handleState(conversa, user.id, texto, msgLog);

    if (contaERecemCriada) {
      resposta +=
        '\n\n_ℹ️ Já tem conta no site? Vá a Definições > Vincular WhatsApp para juntar os seus dados numa só conta, em vez de ficarem separados._';
    }

    await this.mensagemRepository.save(msgLog);

    // Envia resposta ativa de volta para o utilizador via WhatsApp Cloud API
    await this.sendMetaWhatsappMessage(telefone, resposta);

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

    // Comando Saudação / Ajuda
    if (['ola', 'olá', 'oi', 'menu', 'ajuda', 'help', 'iniciar', 'comecar', 'começar'].includes(raw)) {
      conversa.estado = EstadoConversa.IDLE;
      conversa.dadosRascunho = null as any;
      await this.conversaRepository.save(conversa);
      return `👋 *Olá! Sou o seu assistente FinControl.*\n\nComo posso ajudar hoje?\n\n🔹 *Registar despesa:* "Almoço 3500 kz"\n🔹 *Registar receita:* "Salário 350000 kz"\n🔹 *Consultar saldo:* "Saldo" ou "Resumo"\n🔹 *Ver Pés-de-Meia:* "Pé-de-meia"\n🔹 *Guardar no Pé-de-Meia:* "Guardar 5000 kz viagem"\n🔹 *Resgatar do Pé-de-Meia:* "Resgatar 2000 kz viagem"\n🔹 *Criar Pé-de-Meia:* "Criar pé de meia Carro 500000"\n🔹 *Desfazer último:* "Errado" ou "Desfazer"`;
    }

    // Comando Consultar Saldo / Resumo
    if (raw.includes('saldo') || raw.includes('resumo') || raw.includes('extrato')) {
      conversa.estado = EstadoConversa.IDLE;
      conversa.dadosRascunho = null as any;
      await this.conversaRepository.save(conversa);

      const mes = String(new Date().getMonth() + 1).padStart(2, '0');
      const ano = String(new Date().getFullYear());
      try {
        const dashboard = await this.transacoesService.getDashboardSummary(usuarioId, mes, ano);
        const formatKz = (v: number) =>
          new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 0 }).format(v) + ' Kz';

        return `📊 *Resumo Financeiro FinControl (${mes}/${ano})*\n\n🟢 *Receitas:* ${formatKz(dashboard.totalReceitas || 0)}\n🔴 *Despesas:* ${formatKz(dashboard.totalDespesas || 0)}\n💰 *Saldo Líquido:* ${formatKz(dashboard.saldoMes || 0)}\n\n_Para registar novo gasto, envie: "Descrição Valor kz"_`;
      } catch (err: any) {
        this.logger.error(`[SALDO] Erro ao consultar dashboard: ${err?.message}`);
        return '📊 *FinControl:* Não foi possível consultar o saldo agora. Tente novamente em instantes.';
      }
    }

    // Comando Criar Pé-de-Meia pelo WhatsApp
    const matchCriarPe = raw.match(/^(?:criar|novo|nova)\s+(?:pe[- ]de[- ]meia|pede[- ]meia|poupanca|poupança|cofrinho|meta)\s+(.+?)\s+(\d+(?:[.,]\d+)?)(?:\s*(?:kz|aoa))?$/i);
    if (matchCriarPe) {
      conversa.estado = EstadoConversa.IDLE;
      conversa.dadosRascunho = null as any;
      await this.conversaRepository.save(conversa);

      const nome = matchCriarPe[1].trim();
      const valorAlvo = parseFloat(matchCriarPe[2].replace(',', '.'));
      const formatKz = (v: number) => new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 0 }).format(v) + ' Kz';

      try {
        const nova = await this.metasService.create({
          nome,
          valorObjetivo: valorAlvo,
        }, usuarioId);

        return `🎉 *Pé-de-Meia "${nova.nome}" criado com sucesso!*\n\n🎯 *Objetivo:* ${formatKz(valorAlvo)}\n💰 *Guardado:* 0 Kz (0%)\n\n_Para começar a guardar dinheiro, envie:_\n*"Guardar 5000 ${nova.nome}"*`;
      } catch (err: any) {
        return `⚠️ Erro ao criar pé-de-meia: ${err?.message || 'Tente novamente.'}`;
      }
    }

    // Comando Ver / Listar Pés-de-Meia
    if (
      ['pe de meia', 'pe-de-meia', 'pede-meia', 'pedemeia', 'poupanca', 'poupança', 'cofrinho', 'cofrinhos', 'metas'].includes(raw) ||
      raw === 'ver pe de meia' || raw === 'ver pé de meia' || raw === 'meu pe de meia' || raw === 'meus pes de meia' || raw === 'meus pés de meia'
    ) {
      conversa.estado = EstadoConversa.IDLE;
      conversa.dadosRascunho = null as any;
      await this.conversaRepository.save(conversa);

      const metas = await this.metasService.findAll(usuarioId);
      const formatKz = (v: number) => new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 0 }).format(v) + ' Kz';

      if (!metas || metas.length === 0) {
        return `🧦 *Pé-de-Meia (Poupança & Metas)*\n\nAinda não tem nenhum pé-de-meia criado!\n\n💡 *Para criar um pé-de-meia agora, envie:*\n"Criar pé de meia [Nome] [Valor]"\n_Exemplo: Criar pé de meia Viagem 100000 kz_`;
      }

      let textoMetas = `🧦 *Seus Pés-de-Meia (Poupança & Metas)*\n\n`;
      for (const m of metas) {
        const guardado = Number(m.valorAcumulado || 0);
        const alvo = Number(m.valorObjetivo || 1);
        const perc = Math.min(Math.round((guardado / alvo) * 100), 100);
        const barraLen = 8;
        const preenchido = Math.round((perc / 100) * barraLen);
        const barra = '▓'.repeat(preenchido) + '░'.repeat(barraLen - preenchido);

        textoMetas += `🎯 *${m.nome}*\n[${barra}] ${perc}%\n💰 Guardado: *${formatKz(guardado)}* de ${formatKz(alvo)}\n\n`;
      }

      textoMetas += `_Dicas rápidas:_\n🔹 *Guardar:* "Guardar 5000 [Nome]"\n🔹 *Resgatar:* "Resgatar 2000 [Nome]"`;
      return textoMetas;
    }

    // Comando Guardar / Depositar no Pé-de-Meia
    const matchGuardar = raw.match(/^(?:guardar|depositar|poupar|meter)\s+(\d+(?:[.,]\d+)?)(?:\s*(?:kz|aoa))?(?:\s+(?:no|para|em|ao|na)?\s*(?:pe[- ]de[- ]meia|pede[- ]meia|poupanca|poupança|cofrinho|meta)?)?(?:\s+(.+))?$/i);
    if (matchGuardar) {
      conversa.estado = EstadoConversa.IDLE;
      conversa.dadosRascunho = null as any;
      await this.conversaRepository.save(conversa);

      const valor = parseFloat(matchGuardar[1].replace(',', '.'));
      const termoNome = matchGuardar[2]?.trim().toLowerCase();
      const formatKz = (v: number) => new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 0 }).format(v) + ' Kz';

      const metas = await this.metasService.findAll(usuarioId);
      if (!metas || metas.length === 0) {
        return `⚠️ Você ainda não tem nenhum pé-de-meia criado.\n\nCrie um primeiro enviando:\n*"Criar pé de meia ${termoNome ? termoNome : 'Geral'} 50000"*`;
      }

      let metaAlvo: any = null;
      if (termoNome) {
        metaAlvo = metas.find(m => m.nome.toLowerCase().includes(termoNome) || termoNome.includes(m.nome.toLowerCase()));
      }
      if (!metaAlvo && metas.length === 1) {
        metaAlvo = metas[0];
      }

      if (!metaAlvo) {
        const nomes = metas.map(m => `• *${m.nome}*`).join('\n');
        return `⚠️ Tem mais do que um pé-de-meia. Indique em qual quer guardar:\n\n${nomes}\n\nEnvie: *"Guardar ${valor} [Nome]"*`;
      }

      try {
        const atualizada = await this.metasService.adicionarContribuicao(metaAlvo.id, valor, usuarioId);
        const guardado = Number(atualizada.valorAcumulado || 0);
        const alvo = Number(atualizada.valorObjetivo || 1);
        const perc = Math.min(Math.round((guardado / alvo) * 100), 100);
        const restante = Math.max(alvo - guardado, 0);

        return `🧦 *Pé-de-Meia Atualizado! (+${formatKz(valor)})*\n\n🎯 *${atualizada.nome}*\n💰 *Total Guardado:* ${formatKz(guardado)} de ${formatKz(alvo)} (${perc}%)\n${perc >= 100 ? '🎉 *Parabéns! Objetivo atingido!*' : `⏳ Faltam ${formatKz(restante)} para atingir a meta.`}`;
      } catch (err: any) {
        return `⚠️ Erro ao depositar no pé-de-meia: ${err?.message || 'Tente novamente.'}`;
      }
    }

    // Comando Resgatar / Retirar do Pé-de-Meia
    const matchResgatar = raw.match(/^(?:resgatar|retirar|sacar|tirar)\s+(\d+(?:[.,]\d+)?)(?:\s*(?:kz|aoa))?(?:\s+(?:do|de|da)?\s*(?:pe[- ]de[- ]meia|pede[- ]meia|poupanca|poupança|cofrinho|meta)?)?(?:\s+(.+))?$/i);
    if (matchResgatar) {
      conversa.estado = EstadoConversa.IDLE;
      conversa.dadosRascunho = null as any;
      await this.conversaRepository.save(conversa);

      const valor = parseFloat(matchResgatar[1].replace(',', '.'));
      const termoNome = matchResgatar[2]?.trim().toLowerCase();
      const formatKz = (v: number) => new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 0 }).format(v) + ' Kz';

      const metas = await this.metasService.findAll(usuarioId);
      if (!metas || metas.length === 0) {
        return `⚠️ Você ainda não tem nenhum pé-de-meia criado.`;
      }

      let metaAlvo: any = null;
      if (termoNome) {
        metaAlvo = metas.find(m => m.nome.toLowerCase().includes(termoNome) || termoNome.includes(m.nome.toLowerCase()));
      }
      if (!metaAlvo && metas.length === 1) {
        metaAlvo = metas[0];
      }

      if (!metaAlvo) {
        const nomes = metas.map(m => `• *${m.nome}*`).join('\n');
        return `⚠️ Tem mais do que um pé-de-meia. Indique de qual quer resgatar:\n\n${nomes}\n\nEnvie: *"Resgatar ${valor} [Nome]"*`;
      }

      const atual = Number(metaAlvo.valorAcumulado || 0);
      if (atual < valor) {
        return `⚠️ *Saldo insuficiente no pé-de-meia "${metaAlvo.nome}"!*\n\n💰 Saldo guardado: *${formatKz(atual)}*.\nTentou resgatar *${formatKz(valor)}*.`;
      }

      try {
        const atualizada = await this.metasService.resgatar(metaAlvo.id, valor, usuarioId);
        const guardado = Number(atualizada.valorAcumulado || 0);
        return `💸 *Resgate Efetuado com Sucesso! (-${formatKz(valor)})*\n\n🎯 *${atualizada.nome}*\n💰 *Saldo Restante Guardado:* ${formatKz(guardado)}`;
      } catch (err: any) {
        return `⚠️ Erro ao resgatar do pé-de-meia: ${err?.message || 'Tente novamente.'}`;
      }
    }

    // Se estiver aguardando escolha de categoria por número (apenas se a mensagem for EXATAMENTE um dígito 1 a 9)
    if (conversa.estado === EstadoConversa.AGUARDANDO_CORRECAO_CATEGORIA && conversa.dadosRascunho && /^\d+$/.test(raw)) {
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

    if (!contaPrincipal) {
      return '⚠️ Ainda não tem nenhuma conta criada no FinControl. Aceda ao site para criar a sua primeira conta antes de registar transações.';
    }

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

    return respostaFinal;
  }

  /**
   * Envia uma mensagem de texto ativa de volta para o utilizador via Evolution API ou Meta WhatsApp Cloud API
   */
  async sendMetaWhatsappMessage(toPhone: string, messageText: string): Promise<boolean> {
    const cleanedPhone = toPhone.replace(/[^0-9]/g, '');

    // 1. Prioridade: Evolution API (se configurada EVOLUTION_API_URL)
    const evolutionUrl = this.configService.get<string>('EVOLUTION_API_URL');
    const evolutionApiKey = this.configService.get<string>('EVOLUTION_API_KEY');
    const evolutionInstance = this.configService.get<string>('EVOLUTION_INSTANCE_NAME') || 'fincontrol';

    if (evolutionUrl && evolutionApiKey) {
      try {
        const cleanUrl = evolutionUrl.replace(/\/+$/, '');
        const endpoint = `${cleanUrl}/message/sendText/${evolutionInstance}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'apikey': evolutionApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: cleanedPhone,
            text: messageText,
            linkPreview: false,
          }),
        });

        if (res.ok) {
          this.logger.log(`Resposta enviada via Evolution API com sucesso para ${cleanedPhone}`);
          return true;
        } else {
          const errData = await res.json().catch(() => null);
          this.logger.warn(`Erro na Evolution API: ${JSON.stringify(errData)}`);
        }
      } catch (err: any) {
        this.logger.error(`Exceção Evolution API: ${err?.message}`);
      }
    }

    // 2. Fallback: Meta WhatsApp Cloud API
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

    if (!phoneNumberId || !accessToken) {
      this.logger.debug('Credenciais de envio de mensagem ativa não encontradas.');
      return false;
    }

    try {
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

