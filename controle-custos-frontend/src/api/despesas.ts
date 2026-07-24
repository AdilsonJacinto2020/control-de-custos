import type { Despesa, NovaDespesa } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      (Array.isArray(body?.message) ? body.message.join(', ') : body?.message) ??
      `Erro ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const despesasApi = {
  listar: () => request<Despesa[]>('/despesas'),
  criar: (despesa: NovaDespesa) =>
    request<Despesa>('/despesas', {
      method: 'POST',
      body: JSON.stringify(despesa),
    }),
  remover: (id: string) =>
    request<void>(`/despesas/${id}`, { method: 'DELETE' }),
};
