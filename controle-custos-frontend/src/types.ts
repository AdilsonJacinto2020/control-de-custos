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
