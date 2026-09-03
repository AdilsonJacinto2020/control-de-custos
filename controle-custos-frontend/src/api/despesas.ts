import { apiClient } from './client';
import type { Despesa, NovaDespesa } from '../types';

export const despesasApi = {
  listar: () => apiClient<Despesa[]>('/despesas'),
  criar: (despesa: NovaDespesa) =>
    apiClient<Despesa>('/despesas', {
      method: 'POST',
      body: JSON.stringify(despesa),
    }),
  remover: (id: string) =>
    apiClient<void>(`/despesas/${id}`, { method: 'DELETE' }),
};
