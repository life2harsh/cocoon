const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Journal {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  archived_at: string | null;
  created_at: string;
  template_type: string;
  role?: string;
}

export interface Entry {
  id: string;
  journal_id: string;
  author_id: string;
  body: string | null;
  encrypted_body: string | null;
  nonce: string | null;
  prompt_id: string | null;
  created_at: string;
  edited_at: string | null;
  author?: {
    id: string;
    display_name: string;
    is_self: boolean;
  };
}

export interface Member {
  user_id: string;
  role: string;
  display_name: string | null;
}

export interface Streak {
  current_streak: number;
  longest_streak: number;
  last_entry_date: string | null;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const resolvedToken = token ?? getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
}

export const api = {
  auth: {
    google: (token?: string) => fetchApi<{ auth_url: string; state: string }>('/auth/google', { method: 'POST' }, token),
    callback: (code: string, token?: string) => fetchApi<{ access_token: string; user: User }>('/auth/callback', { 
      method: 'POST',
      body: JSON.stringify({ code, state: '' }),
    }, token),
    signout: (token?: string) => fetchApi<{ message: string }>('/auth/signout', { method: 'POST' }, token),
    me: (token?: string) => fetchApi<User>('/me', {}, token),
  },
  journals: {
    list: (token?: string) => fetchApi<Journal[]>('/journals', {}, token),
    get: (id: string, token?: string) => fetchApi<{ journal: Journal; members: Member[]; entries: Entry[] }>(`/journals/${id}`, {}, token),
    create: (data: { name?: string; template_type?: string }, token?: string) => fetchApi<Journal>('/journals', { method: 'POST', body: JSON.stringify(data) }, token),
    update: (id: string, data: { name?: string; description?: string; archived?: boolean }, token?: string) => fetchApi<{ message: string }>(`/journals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    delete: (id: string, token?: string) => fetchApi<{ message: string }>(`/journals/${id}`, { method: 'DELETE' }, token),
    settings: {
      get: (id: string, token?: string) => fetchApi<{ ai_prompts_enabled: boolean; template_type: string }>(`/journals/${id}/settings`, {}, token),
      update: (id: string, data: { ai_prompts_enabled?: boolean }, token?: string) => fetchApi<{ message: string }>(`/journals/${id}/settings`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    },
  },
  entries: {
    create: (journalId: string, data: { body?: string; encrypted_body?: string; nonce?: string }, token?: string) => 
      fetchApi<{ id: string; created_at: string }>(`/journals/${journalId}/entries`, { method: 'POST', body: JSON.stringify(data) }, token),
    update: (journalId: string, entryId: string, data: { body?: string; encrypted_body?: string; nonce?: string }, token?: string) =>
      fetchApi<{ message: string }>(`/journals/${journalId}/entries/${entryId}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
  },
  invites: {
    list: (token?: string) => fetchApi<{ id: string; journal_id: string; code: string; expires_at: string }[]>('/invites', {}, token),
    create: (journalId: string, token?: string) => fetchApi<{ id: string; code: string }>('/invites', { method: 'POST', body: JSON.stringify({ journal_id: journalId }) }, token),
    accept: (code: string, token?: string) => fetchApi<{ journalId: string }>('/invites/accept', { method: 'POST', body: JSON.stringify({ code }) }, token),
  },
  prompts: {
    daily: (token?: string) => fetchApi<{ date: string; prompt: string }>('/prompts/daily', {}, token),
  },
  streaks: {
    get: (token?: string) => fetchApi<Streak>('/streaks', {}, token),
  },
};

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  // On client: prefer cookie, fall back to localStorage for backwards compat
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : localStorage.getItem('token');
}

export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
}

export function clearToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
}
