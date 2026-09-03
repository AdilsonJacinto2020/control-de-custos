import { apiClient } from './client';
import type { Conta, CategoriaItem, Transacao, NovaTransacao } from '../types';

export const contasApi = {
  listar: () => apiClient<Conta[]>('/contas'),
  criar: (conta: { nome: string; tipo?: string; moeda?: string }) =>
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
    return apiClient<{
      totalReceitas: number;
      totalDespesas: number;
      saldoMes: number;
      totalTransacoes: number;
      porCategoria: Record<string, number>;
      transacoes: Transacao[];
    }>(`/transacoes/dashboard${qs}`);
  },
  criar: (transacao: NovaTransacao) =>
    apiClient<Transacao>('/transacoes', {
      method: 'POST',
      body: JSON.stringify(transacao),
    }),
  remover: (id: string) => apiClient<void>(`/transacoes/${id}`, { method: 'DELETE' }),
};
