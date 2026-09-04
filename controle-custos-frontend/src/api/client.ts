const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('fincontrol_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('fincontrol_token');
      localStorage.removeItem('fincontrol_user');
    }
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
