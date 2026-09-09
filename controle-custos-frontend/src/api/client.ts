const rawApiUrl =
  import.meta.env.VITE_API_URL ??
  (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
    ? 'https://control-de-custos.vercel.app'
    : 'http://localhost:3001');

const API_URL = rawApiUrl.replace(/\/+$/, '');

let guestLoginPromise: Promise<string | null> | null = null;

async function getGuestToken(): Promise<string | null> {
  if (!guestLoginPromise) {
    guestLoginPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/guest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data && data.accessToken) {
          localStorage.setItem('fincontrol_token', data.accessToken);
          if (data.user) {
            localStorage.setItem(
              'fincontrol_user',
              JSON.stringify({
                id: data.user.id,
                name: data.user.nome || 'Convidado Demo',
                email: data.user.email,
                isGuest: true,
                streak: 1,
                bestStreak: 1,
                lastCheckinDate: new Date().toISOString().slice(0, 10),
              })
            );
          }
          return data.accessToken as string;
        }
        return null;
      } catch {
        return null;
      } finally {
        guestLoginPromise = null;
      }
    })();
  }
  return guestLoginPromise;
}

export async function apiClient<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
  let token = localStorage.getItem('fincontrol_token');

  // Se não há token, tenta obter imediatamente antes do primeiro disparo
  if (!token) {
    token = await getGuestToken();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${API_URL}${normalizedPath}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('fincontrol_token');
      localStorage.removeItem('fincontrol_user');

      // Se falhou 401 e ainda não tentámos com um novo token de convidado
      if (!isRetry) {
        const freshToken = await getGuestToken();
        if (freshToken) {
          return apiClient<T>(path, init, true);
        }
      }
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

