export type Session = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'member';
  canEdit: boolean;
  isOwner: boolean;
  mustChange: boolean;
};

export type DocumentRow = { id: string; data: Record<string, unknown> };

export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      'X-Terzo': '1',
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const result: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined' && !location.pathname.startsWith('/login')) {
      location.assign('/login?expirada=1');
    }
    const message = result && typeof result === 'object' && 'error' in result
      ? String((result as { error: unknown }).error)
      : 'Erro de conexão com o servidor.';
    throw new Error(message);
  }
  return result as T;
}

export function post<T>(url: string, data: unknown) {
  return request<T>(url, { method: 'POST', body: JSON.stringify(data) });
}
