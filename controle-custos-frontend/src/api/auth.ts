import { apiClient } from './client';

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    nome: string;
    email: string;
    avatarUrl?: string;
    moedaReferencia?: string;
    modeloOrcamento?: string;
  };
}

export const authApi = {
  loginGoogle: (credential: string) =>
    apiClient<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    }),
  loginGuest: () =>
    apiClient<AuthResponse>('/auth/guest', {
      method: 'POST',
    }),
  getProfile: () => apiClient<any>('/auth/me'),
};
