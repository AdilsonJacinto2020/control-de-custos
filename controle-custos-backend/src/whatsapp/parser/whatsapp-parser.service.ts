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

    // Suporta formatos:
    // - "almoco 3500 kz", "gasosa 2.500 aoa", "táxi 2k", "salário 150.000", "jantar 45$"
    const matchK = raw.match(/(\d+(?:[.,]\d+)?)\s*k\b/i);
    const valorComMoedaRegex = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?)\s*(kz|kwanza|kwanzas|aoa|usd|\$|eur|€)\b/gi;
    const numeroGeralRegex = /\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?)\b/;

    if (matchK) {
      const numBase = parseFloat(matchK[1].replace(',', '.'));
      valor = numBase * 1000;
      moeda = 'AOA';
    } else {
      const matchComMoeda = texto.match(valorComMoedaRegex);
      if (matchComMoeda) {
        const matchValor = matchComMoeda[0].match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?)\s*(kz|kwanza|kwanzas|aoa|usd|\$|eur|€)?/i);
        if (matchValor) {
          let numStr = matchValor[1];
          if (numStr.includes('.') && numStr.includes(',')) {
            numStr = numStr.replace(/\./g, '').replace(',', '.');
          } else if (numStr.includes('.') && (numStr.match(/\./g) || []).length === 1 && numStr.split('.')[1].length === 3) {
            numStr = numStr.replace('.', '');
          } else {
            numStr = numStr.replace(',', '.');
          }

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
      } else {
        // Apenas aceita número geral se houver palavras de intenção financeira (ex: gastei, paguei, almoco 3500)
        // Evita interpretar números soltos (como '7' ou códigos) como dinheiro
        const matchValor = texto.match(numeroGeralRegex);
        const palavrasFinanceiras = ['gastei', 'paguei', 'custou', 'comprei', 'recebi', 'ganhei', 'salario', 'salário', 'deposito', 'depósito', 'transferi'];
        const temPalavraFinanceira = palavrasFinanceiras.some((w) => raw.includes(w));
        
        if (matchValor && temPalavraFinanceira) {
          let numStr = matchValor[1];
          if (numStr.includes('.') && numStr.includes(',')) {
            numStr = numStr.replace(/\./g, '').replace(',', '.');
          } else if (numStr.includes('.') && (numStr.match(/\./g) || []).length === 1 && numStr.split('.')[1].length === 3) {
            numStr = numStr.replace('.', '');
          } else {
            numStr = numStr.replace(',', '.');
          }
          valor = parseFloat(numStr);
          moeda = 'AOA';
        }
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

    const containsWord = (text: string, word: string) => {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9])${escaped}($|\\s|[^a-zA-Z0-9])`, 'i');
      return regex.test(text);
    };

    for (const cat of categorias) {
      // Comparar nome direto da categoria
      if (containsWord(rawNormalized, normalize(cat.nome))) {
        categoriaId = cat.id;
        categoriaNome = cat.nome;
        confianca = 0.95;
        break;
      }

      // Comparar regras/palavras-chave da categoria
      if (cat.regrasDeCategorizacao && Array.isArray(cat.regrasDeCategorizacao)) {
        const foundKeyword = cat.regrasDeCategorizacao.some((kw) =>
          containsWord(rawNormalized, normalize(kw)),
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
