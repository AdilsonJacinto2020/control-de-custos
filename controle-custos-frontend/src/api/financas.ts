import { apiClient } from './client';
import type {
  Conta,
  CategoriaItem,
  Transacao,
  NovaTransacao,
  DashboardData,
  OrcamentoItem,
  StatusOrcamento,
  FonteRendimento,
  MetaPoupanca,
  EventoFuturoItem,
  PontoProjecao,
} from '../types';

export const usuariosApi = {
  gerarCodigoWhatsapp: () =>
    apiClient<{ codigo: string; expiraEm: string }>('/usuarios/whatsapp/gerar-codigo', {
      method: 'POST',
    }),
};

export const contasApi = {
  listar: () => apiClient<Conta[]>('/contas'),
  criar: (conta: { nome: string; tipo?: string; moeda?: string; finalidade?: string }) =>
    apiClient<Conta>('/contas', {
      method: 'POST',
      body: JSON.stringify(conta),
    }),
  remover: (id: string) => apiClient<void>(`/contas/${id}`, { method: 'DELETE' }),
};

export const categoriasApi = {
  listar: () => apiClient<CategoriaItem[]>('/categorias'),
  criar: (categoria: { nome: string; icone?: string; cor?: string; categoriaPaiId?: string }) =>
    apiClient<CategoriaItem>('/categorias', {
      method: 'POST',
      body: JSON.stringify(categoria),
    }),
  remover: (id: string) => apiClient<void>(`/categorias/${id}`, { method: 'DELETE' }),
};

export const transacoesApi = {
  listar: (mes?: string, ano?: string) => {
    const params = new URLSearchParams();
    if (mes) params.append('mes', mes);
    if (ano) params.append('ano', ano);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient<Transacao[]>(`/transacoes${qs}`);
  },
  obterDashboard: (mes?: string, ano?: string) => {
    const params = new URLSearchParams();
    if (mes) params.append('mes', mes);
    if (ano) params.append('ano', ano);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient<DashboardData>(`/transacoes/dashboard${qs}`);
  },
  criar: (transacao: NovaTransacao) =>
    apiClient<Transacao>('/transacoes', {
      method: 'POST',
      body: JSON.stringify(transacao),
    }),
  remover: (id: string) => apiClient<void>(`/transacoes/${id}`, { method: 'DELETE' }),
  resetAll: () => apiClient<{ deletedCount: number }>('/transacoes/reset-all', { method: 'DELETE' }),
};

export const orcamentosApi = {
  listar: () => apiClient<OrcamentoItem[]>('/orcamentos'),
  obterStatus: () => apiClient<StatusOrcamento[]>('/orcamentos/status'),
  criar: (orcamento: { categoriaId: string; limiteMensal: number; alertaPercentual?: number }) =>
    apiClient<OrcamentoItem>('/orcamentos', {
      method: 'POST',
      body: JSON.stringify(orcamento),
    }),
  remover: (id: string) => apiClient<void>(`/orcamentos/${id}`, { method: 'DELETE' }),
};

export const fontesRendimentoApi = {
  listar: () => apiClient<FonteRendimento[]>('/fontes-rendimento'),
  obterProjecao: () =>
    apiClient<{
      totalRendimentoMensalMedio: number;
      fontesFixas: FonteRendimento[];
      fontesVariaveis: FonteRendimento[];
    }>('/fontes-rendimento/projecao'),
  criar: (fonte: {
    nome: string;
    tipo: string;
    periodicidade: string;
    valorBase: number;
    moeda?: string;
    diaPrevistoRecebimento?: number;
  }) =>
    apiClient<FonteRendimento>('/fontes-rendimento', {
      method: 'POST',
      body: JSON.stringify(fonte),
    }),
  remover: (id: string) => apiClient<void>(`/fontes-rendimento/${id}`, { method: 'DELETE' }),
};

export const metasPoupancaApi = {
  listar: () => apiClient<MetaPoupanca[]>('/metas-poupanca'),
  criar: (meta: {
    nome: string;
    valorAlvo: number;
    moeda?: string;
    dataLimite?: string;
    prioridade?: string;
  }) =>
    apiClient<MetaPoupanca>('/metas-poupanca', {
      method: 'POST',
      body: JSON.stringify(meta),
    }),
  contribuir: (id: string, valor: number) =>
    apiClient<MetaPoupanca>(`/metas-poupanca/${id}/contribuir`, {
      method: 'POST',
      body: JSON.stringify({ valor }),
    }),
  resgatar: (id: string, valor: number) =>
    apiClient<MetaPoupanca>(`/metas-poupanca/${id}/resgatar`, {
      method: 'POST',
      body: JSON.stringify({ valor }),
    }),
  remover: (id: string) => apiClient<void>(`/metas-poupanca/${id}`, { method: 'DELETE' }),
};

export const eventosFuturosApi = {
  listar: () => apiClient<EventoFuturoItem[]>('/eventos-futuros'),
  criar: (evento: {
    nome: string;
    dataInicioPrevista: string;
    dataFimPrevista?: string;
    status?: string;
    custoTotalEstimado?: number;
    moeda?: string;
    itensCusto?: { descricao: string; valorEstimado: number }[];
    observacoes?: string;
  }) =>
    apiClient<EventoFuturoItem>('/eventos-futuros', {
      method: 'POST',
      body: JSON.stringify(evento),
    }),
  alterarStatus: (id: string, status: string) =>
    apiClient<EventoFuturoItem>(`/eventos-futuros/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  remover: (id: string) => apiClient<void>(`/eventos-futuros/${id}`, { method: 'DELETE' }),
};

export const projecaoApi = {
  obterFluxoCaixa: (meses = 6) =>
    apiClient<{
      saldoAtualConsolidado: number;
      moedaReferencia: string;
      projecaoMeses: PontoProjecao[];
    }>(`/projecao/fluxo-caixa?meses=${meses}`),
};

export const espacosPartilhadosApi = {
  listar: () => apiClient<import('../types').EspacoPartilhadoItem[]>('/espacos-partilhados'),
  obter: (id: string) => apiClient<import('../types').EspacoPartilhadoItem>(`/espacos-partilhados/${id}`),
  criar: (espaco: { nome: string; descricao?: string }) =>
    apiClient<import('../types').EspacoPartilhadoItem>('/espacos-partilhados', {
      method: 'POST',
      body: JSON.stringify(espaco),
    }),
  adicionarMembro: (
    espacoId: string,
    membro: { emailOuId: string; papel?: string; percentualDivisaoPadrao?: number },
  ) =>
    apiClient(`/espacos-partilhados/${espacoId}/membros`, {
      method: 'POST',
      body: JSON.stringify(membro),
    }),
  obterAcertos: (espacoId: string) =>
    apiClient<import('../types').ResumoAcertosEspaco>(`/espacos-partilhados/${espacoId}/acertos`),
  remover: (id: string) => apiClient<void>(`/espacos-partilhados/${id}`, { method: 'DELETE' }),
};

export const cambioApi = {
  obterTaxas: () => apiClient<import('../types').TaxaCambioItem[]>('/cambio/taxas'),
  definirTaxaPersonalizada: (taxa: {
    moedaOrigem: string;
    moedaDestino: string;
    taxa: number;
    usarPersonalizada?: boolean;
  }) =>
    apiClient('/cambio/taxas-personalizadas', {
      method: 'POST',
      body: JSON.stringify(taxa),
    }),
  converter: (valor: number, de: string, para: string) =>
    apiClient<{
      valorConvertido: number;
      taxaUsada: number;
      tipoTaxa: 'oficial' | 'personalizada';
    }>(`/cambio/converter?valor=${valor}&de=${de}&para=${para}`),
};


