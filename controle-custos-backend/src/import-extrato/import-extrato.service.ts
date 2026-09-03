import { Injectable } from '@nestjs/common';
import { OrigemTransacao, StatusDuplicado, TipoTransacao, Transacao } from '../transacoes/transacao.entity';
import { TransacoesService } from '../transacoes/transacoes.service';
import { CategoriasService } from '../categorias/categorias.service';

export interface ExtratoItemImportado {
  data: string;
  descricao: string;
  valor: number;
  tipo: TipoTransacao;
  categoriaId?: string;
  statusDuplicado: StatusDuplicado;
  possivelDuplicadoDeId?: string;
}

@Injectable()
export class ImportExtratoService {
  constructor(
    private readonly transacoesService: TransacoesService,
    private readonly categoriasService: CategoriasService,
  ) {}

  async parseExtratoCSV(
    csvContent: string,
    contaId: string,
    usuarioId: string,
  ): Promise<ExtratoItemImportado[]> {
    const lines = csvContent.split('\n').filter((l) => l.trim().length > 0);
    const categorias = await this.categoriasService.findAll(usuarioId);
    const transacoesExistentes = await this.transacoesService.findAll(usuarioId);

    const itens: ExtratoItemImportado[] = [];

    for (const line of lines) {
      // Formato CSV básico: Data;Descricao;Valor (ou vírgula)
      const cols = line.split(/[;,]/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 3) continue;

      const dataStr = cols[0];
      const descricao = cols[1];
      const valorStr = cols[2].replace(',', '.');
      const valorNum = parseFloat(valorStr);

      if (isNaN(valorNum)) continue;

      const valor = Math.abs(valorNum);
      const tipo = valorNum < 0 ? TipoTransacao.DESPESA : TipoTransacao.RECEITA;

      // Auto-categorização por palavras-chave
      let categoriaId: string | undefined;
      const descLower = descricao.toLowerCase();
      for (const cat of categorias) {
        if (cat.regrasDeCategorizacao?.some((kw) => descLower.includes(kw.toLowerCase()))) {
          categoriaId = cat.id;
          break;
        }
      }

      // Regra de Deduplicação Assistida: Janela de ±2 dias e tolerância no valor
      let statusDuplicado = StatusDuplicado.NENHUM;
      let possivelDuplicadoDeId: string | undefined;

      const dataItem = new Date(dataStr).getTime();

      for (const t of transacoesExistentes) {
        if (t.contaId === contaId) {
          const valorExistente = Number(t.valor);
          const diferencaValor = Math.abs(valorExistente - valor);
          const margemValor = valor * 0.02; // 2% tolerância

          const dataExistente = new Date(t.data).getTime();
          const diferencaDias = Math.abs(dataExistente - dataItem) / (1000 * 60 * 60 * 24);

          if (diferencaValor <= margemValor && diferencaDias <= 2) {
            statusDuplicado = StatusDuplicado.SUSPEITO;
            possivelDuplicadoDeId = t.id;
            break;
          }
        }
      }

      itens.push({
        data: dataStr,
        descricao,
        valor,
        tipo,
        categoriaId,
        statusDuplicado,
        possivelDuplicadoDeId,
      });
    }

    return itens;
  }

  async confirmarImportacao(
    itens: ExtratoItemImportado[],
    contaId: string,
    usuarioId: string,
  ): Promise<Transacao[]> {
    const criadas: Transacao[] = [];

    for (const item of itens) {
      if (item.statusDuplicado === StatusDuplicado.CONFIRMADO_DUPLICADO) {
        // Ignora duplicado confirmado pelo utilizador
        continue;
      }

      const t = await this.transacoesService.create(
        {
          contaId,
          tipo: item.tipo,
          valor: item.valor,
          descricao: item.descricao,
          data: item.data,
          categoriaId: item.categoriaId,
          origem: OrigemTransacao.IMPORT_EXTRATO,
        },
        usuarioId,
      );
      criadas.push(t);
    }

    return criadas;
  }
}
