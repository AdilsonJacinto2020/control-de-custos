import { Injectable } from '@nestjs/common';
import { Categoria } from '../../categorias/categoria.entity';
import { TipoTransacao } from '../../transacoes/transacao.entity';

export interface ParsedTransaction {
  valor?: number;
  moeda: string;
  tipo: TipoTransacao;
  categoriaId?: string;
  categoriaNome?: string;
  descricao: string;
  data: string;
  confianca: number; // 0 a 1
}

@Injectable()
export class WhatsappParserService {
  parseTexto(texto: string, categorias: Categoria[]): ParsedTransaction {
    const raw = texto.trim().toLowerCase();

    // 1. Extração de Valor e Moeda
    let valor: number | undefined;
    let moeda = 'AOA';

    // Regex para identificar número seguido de kz, kwanza, aoa, $, usd, eur
    const valorRegex = /(\d+(?:[.,]\d+)?)\s*(kz|kwanza|kwanzas|aoa|usd|\$|eur|€)?/i;
    const matchValor = texto.match(valorRegex);

    if (matchValor) {
      const numStr = matchValor[1].replace(',', '.');
      valor = parseFloat(numStr);

      const indicMoeda = (matchValor[2] || '').toLowerCase();
      if (indicMoeda.includes('usd') || indicMoeda === '$') {
        moeda = 'USD';
      } else if (indicMoeda.includes('eur') || indicMoeda === '€') {
        moeda = 'EUR';
      } else {
        moeda = 'AOA';
      }
    }

    // 2. Direção (receita vs despesa)
    const triggerReceita = ['recebi', 'ganhei', 'entrou', 'recebimento', 'salario', 'salário'];
    const isReceita = triggerReceita.some((word) => raw.includes(word));
    const tipo = isReceita ? TipoTransacao.RECEITA : TipoTransacao.DESPESA;

    // 3. Categoria Matching (com normalização de acentos: almoço -> almoco)
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const rawNormalized = normalize(raw);

    let categoriaId: string | undefined;
    let categoriaNome: string | undefined;
    let confianca = valor ? 0.7 : 0.2;

    for (const cat of categorias) {
      // Comparar nome direto da categoria
      if (rawNormalized.includes(normalize(cat.nome))) {
        categoriaId = cat.id;
        categoriaNome = cat.nome;
        confianca = 0.95;
        break;
      }

      // Comparar regras/palavras-chave da categoria
      if (cat.regrasDeCategorizacao && Array.isArray(cat.regrasDeCategorizacao)) {
        const foundKeyword = cat.regrasDeCategorizacao.some((kw) =>
          rawNormalized.includes(normalize(kw)),
        );
        if (foundKeyword) {
          categoriaId = cat.id;
          categoriaNome = cat.nome;
          confianca = 0.9;
          break;
        }
      }
    }

    // 4. Data
    const dataHoje = new Date().toISOString().slice(0, 10);
    let data = dataHoje;
    if (raw.includes('ontem')) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      data = d.toISOString().slice(0, 10);
    }

    // 5. Descrição limpa
    const descricao = texto.trim();

    return {
      valor,
      moeda,
      tipo,
      categoriaId,
      categoriaNome,
      descricao,
      data,
      confianca,
    };
  }
}
