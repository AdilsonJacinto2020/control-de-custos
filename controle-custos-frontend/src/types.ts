export type TipoConta = 'banco' | 'carteira_movel' | 'dinheiro_fisico' | 'poupanca';
export type MoedaConta = 'AOA' | 'USD' | 'EUR';

export interface Conta {
  id: string;
  nome: string;
  tipo: TipoConta;
  moeda: MoedaConta;
  saldoAtual: number;
  ativa: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CategoriaItem {
  id: string;
  nome: string;
  categoriaPaiId?: string;
  icone?: string;
  cor?: string;
  usuarioId?: string;
  regrasDeCategorizacao?: string[];
  ativa: boolean;
}

export type TipoTransacao = 'receita' | 'despesa' | 'transferencia_entre_contas';
export type OrigemTransacao = 'whatsapp' | 'import_extrato' | 'ocr_recibo' | 'manual' | 'evento_projetado';

export interface Transacao {
  id: string;
  usuarioId: string;
  contaId: string;
  tipo: TipoTransacao;
  valor: number | string;
  moeda: string;
  categoriaId?: string;
  descricao: string;
  data: string;
  origem: OrigemTransacao;
  contaDestinoId?: string;
  taxaCambioUsada?: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface NovaTransacao {
  contaId: string;
  tipo: TipoTransacao;
  valor: number;
  descricao: string;
  data: string;
  categoriaId?: string;
  contaDestinoId?: string;
  taxaCambioUsada?: number;
}

// Compatibilidade de transição para telas antigas
export interface Despesa {
  id: string;
  descricao: string;
  valor: number | string;
  data: string;
  categoria: Categoria;
  criadoEm: string;
  atualizadoEm: string;
}

export interface NovaDespesa {
  descricao: string;
  valor: number;
  data: string;
  categoria: Categoria;
}

export const CATEGORIAS = [
  'Alimentação',
  'Transporte',
  'Lazer',
  'Contas Fixas',
  'Saúde',
  'Educação',
  'Outros',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];
