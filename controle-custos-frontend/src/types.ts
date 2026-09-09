export type TipoConta = 'banco' | 'carteira_movel' | 'dinheiro_fisico' | 'poupanca';
export type MoedaConta = 'AOA' | 'USD' | 'EUR';

export type FinalidadeConta = 'pessoal' | 'negocio';

export interface Conta {
  id: string;
  nome: string;
  tipo: TipoConta;
  moeda: MoedaConta;
  saldoAtual: number;
  ativa: boolean;
  finalidade?: FinalidadeConta;
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
  fonteRendimentoId?: string;
  espacoPartilhadoId?: string;
  divisaoConjunta?: boolean;
  taxaCambioUsada?: number;
  criadoEm: string;
  atualizadoEm: string;
  conta?: Conta;
  categoria?: CategoriaItem;
}

export interface NovaTransacao {
  contaId: string;
  tipo: TipoTransacao;
  valor: number;
  descricao: string;
  data: string;
  categoriaId?: string;
  contaDestinoId?: string;
  fonteRendimentoId?: string;
  espacoPartilhadoId?: string;
  divisaoConjunta?: boolean;
  taxaCambioUsada?: number;
}

export interface DashboardData {
  totalReceitas: number;
  totalDespesas: number;
  saldoMes: number;
  totalTransacoes: number;
  porCategoria: Record<string, number>;
  transacoes: Transacao[];
}

// Orçamentos
export interface OrcamentoItem {
  id: string;
  categoriaId: string;
  limiteMensal: number;
  alertaPercentual: number;
  ativo: boolean;
  categoria?: CategoriaItem;
}

export interface StatusOrcamento {
  categoriaId: string;
  categoriaNome: string;
  limiteMensal: number;
  gastoAtual: number;
  percentualUsado: number;
  projetadoFimDoMes: number;
  alertaPercentual: number;
  emAlerta: boolean;
  estourou: boolean;
}

// Fontes de Rendimento
export type TipoRendimento = 'fixo' | 'variavel';
export type PeriodicidadeRendimento = 'mensal' | 'quinzenal' | 'semanal' | 'esporadico';

export interface FonteRendimento {
  id: string;
  nome: string;
  tipo: TipoRendimento;
  periodicidade: PeriodicidadeRendimento;
  valorBase: number;
  moeda: string;
  diaPrevistoRecebimento?: number;
  ativo: boolean;
}

// Metas de Poupança
export type PrioridadeMeta = 'baixa' | 'media' | 'alta';

export interface MetaPoupanca {
  id: string;
  nome: string;
  valorAlvo: number;
  valorAcumulado: number;
  moeda: string;
  dataLimite?: string;
  prioridade: PrioridadeMeta;
  concluida: boolean;
}

// Eventos Futuros
export type StatusEvento = 'planeado' | 'ativo' | 'concluido' | 'cancelado';

export interface ItemCustoEvento {
  id?: string;
  descricao: string;
  valorEstimado: number;
  moeda?: string;
  categoriaId?: string;
}

export interface EventoFuturoItem {
  id: string;
  nome: string;
  dataInicioPrevista: string;
  dataFimPrevista?: string;
  status: StatusEvento;
  custoTotalEstimado: number;
  moeda: string;
  itensCusto: ItemCustoEvento[];
  observacoes?: string;
}

// Projeção de Fluxo de Caixa
export interface PontoProjecao {
  mes: string;
  ano: number;
  saldoProjetado: number;
  receitasEsperadas: number;
  despesasEsperadas: number;
  saldoMinimoEstimado?: number;
  saldoMaximoEstimado?: number;
}

// Espaços Partilhados (Fase 6)
export type PapelEspaco = 'proprietario' | 'administrador' | 'membro';

export interface MembroEspaco {
  id: string;
  usuarioId: string;
  papel: PapelEspaco;
  percentualDivisaoPadrao: number;
  usuario?: {
    id: string;
    nome: string;
    email: string;
  };
}

export interface EspacoPartilhadoItem {
  id: string;
  nome: string;
  descricao?: string;
  criadoPorUsuarioId: string;
  membros: MembroEspaco[];
  criadoEm: string;
}

export interface ResumoAcertosEspaco {
  espacoId: string;
  espacoNome: string;
  totalMembros: number;
  divisaoSugeridaPercentual: string;
  membros: {
    id: string;
    nome: string;
    email: string;
    papel: PapelEspaco;
    percentual: number;
  }[];
}

// Câmbio Multi-Moeda (Fase 7)
export interface TaxaCambioItem {
  par: string;
  origem: string;
  destino: string;
  taxaOficial: number;
  fonteTaxaOficial?: string;
  taxaPersonalizada: number | null;
  usarPersonalizada: boolean;
}

// Compatibilidade de transição para telas legadas
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

