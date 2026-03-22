const API_BASE = import.meta.env.VITE_API_URL || "/api";

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  public_key?: string | null;
  has_key_backup?: boolean;
}

export interface Journal {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
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
  prompt_text?: string | null;
  prompt_date?: string | null;
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
  public_key?: string | null;
}

export interface Streak {
  current_streak: number;
  longest_streak: number;
  last_entry_date: string | null;
  activity: Array<{
    date: string;
    count: number;
  }>;
}

export interface AppSettings {
  daily_prompts_enabled: boolean;
  context_suggestions_enabled: boolean;
  notifications_enabled: boolean;
  daily_reminder_enabled: boolean;
  daily_reminder_time: string;
  daily_reminder_count: number;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  encryption_ready: boolean;
  encryption_backup_ready: boolean;
}

export interface RecoveryKeyBackup {
  version: number;
  algorithm: string;
  encrypted_private_key: string;
  salt: string;
  nonce: string;
}

export interface PushPublicKeyResponse {
  enabled: boolean;
  public_key: string | null;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface DailyPrompt {
  id: string | null;
  date: string;
  prompt: string | null;
  template_type: string;
  enabled: boolean;
}

export interface JournalKeyState {
  current: {
    encrypted_key: string;
    key_version: number;
  } | null;
  members: Array<
    Member & {
      has_key: boolean;
    }
  >;
}

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  target_url: string | null;
  journal_id: string | null;
  journal_name: string | null;
  read_at: string | null;
  created_at: string;
  actor: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface NotificationFeed {
  items: NotificationItem[];
  unread_count: number;
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
  profile: {
    get: (token?: string) => fetchApi<User>('/profile', {}, token),
    update: (
      data: { display_name?: string; public_key?: string | null },
      token?: string
    ) =>
      fetchApi<{ success: boolean; user: User }>('/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, token),
  },
  recovery: {
    get: (token?: string) =>
      fetchApi<{ has_backup: boolean; backup: RecoveryKeyBackup | null }>('/profile/recovery-key', {}, token),
    save: (backup: RecoveryKeyBackup, token?: string) =>
      fetchApi<{ success: boolean; user: User; has_backup: boolean }>('/profile/recovery-key', {
        method: 'PUT',
        body: JSON.stringify({ backup }),
      }, token),
    remove: (token?: string) =>
      fetchApi<{ success: boolean; user: User; has_backup: boolean }>('/profile/recovery-key', {
        method: 'DELETE',
      }, token),
  },
  push: {
    publicKey: (token?: string) => fetchApi<PushPublicKeyResponse>('/push/public-key', {}, token),
    subscribe: (subscription: PushSubscriptionPayload, token?: string) =>
      fetchApi<{ success: boolean }>('/push/subscription', {
        method: 'PUT',
        body: JSON.stringify(subscription),
      }, token),
    unsubscribe: (endpoint: string, token?: string) =>
      fetchApi<{ success: boolean }>('/push/subscription', {
        method: 'DELETE',
        body: JSON.stringify({ endpoint }),
      }, token),
  },
  settings: {
    get: (token?: string) => fetchApi<AppSettings>('/settings', {}, token),
    update: (
      data: Partial<
        Pick<
          AppSettings,
          | "daily_prompts_enabled"
          | "context_suggestions_enabled"
          | "notifications_enabled"
          | "daily_reminder_enabled"
          | "daily_reminder_time"
          | "daily_reminder_count"
          | "quiet_hours_enabled"
          | "quiet_hours_start"
          | "quiet_hours_end"
        >
      >,
      token?: string
    ) =>
      fetchApi<{ success: boolean; settings: AppSettings }>('/settings', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, token),
  },
  journals: {
    list: (token?: string) => fetchApi<Journal[]>('/journals', {}, token),
    get: (id: string, token?: string) => fetchApi<{ journal: Journal; members: Member[]; entries: Entry[] }>(`/journals/${id}`, {}, token),
    create: (
      data: { name?: string; description?: string; template_type?: string; encrypted_key?: string; key_version?: number },
      token?: string
    ) => fetchApi<Journal>('/journals', { method: 'POST', body: JSON.stringify(data) }, token),
    update: (id: string, data: { name?: string; description?: string; archived?: boolean }, token?: string) => fetchApi<{ message: string }>(`/journals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    delete: (id: string, token?: string) => fetchApi<{ message: string }>(`/journals/${id}`, { method: 'DELETE' }, token),
    settings: {
      get: (id: string, token?: string) => fetchApi<{ ai_prompts_enabled: boolean; template_type: string }>(`/journals/${id}/settings`, {}, token),
      update: (id: string, data: { ai_prompts_enabled?: boolean }, token?: string) => fetchApi<{ message: string }>(`/journals/${id}/settings`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    },
    keys: {
      get: (id: string, token?: string) => fetchApi<JournalKeyState>(`/journals/${id}/keys`, {}, token),
      share: (
        id: string,
        data: { recipients: Array<{ user_id: string; encrypted_key: string; key_version?: number }> },
        token?: string
      ) => fetchApi<{ message: string }>(`/journals/${id}/keys`, { method: 'POST', body: JSON.stringify(data) }, token),
    },
  },
  entries: {
    create: (journalId: string, data: { body?: string; encrypted_body?: string; nonce?: string; prompt_id?: string }, token?: string) => 
      fetchApi<{ id: string; created_at: string }>(`/journals/${journalId}/entries`, { method: 'POST', body: JSON.stringify(data) }, token),
    update: (journalId: string, entryId: string, data: { body?: string; encrypted_body?: string; nonce?: string; prompt_id?: string }, token?: string) =>
      fetchApi<{ message: string }>(`/journals/${journalId}/entries/${entryId}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
  },
  invites: {
    list: (token?: string) => fetchApi<{ id: string; journal_id: string; code: string; expires_at: string }[]>('/invites', {}, token),
    create: (journalId: string, token?: string) => fetchApi<{ id: string; code: string }>('/invites', { method: 'POST', body: JSON.stringify({ journal_id: journalId }) }, token),
    accept: (code: string, token?: string) => fetchApi<{ journalId: string }>('/invites/accept', { method: 'POST', body: JSON.stringify({ code }) }, token),
  },
  prompts: {
    daily: (journalId?: string, templateType?: string, token?: string) => {
      const params = new URLSearchParams();
      if (journalId) params.set('journal_id', journalId);
      if (templateType) params.set('template_type', templateType);
      const query = params.toString();
      return fetchApi<DailyPrompt>(`/prompts/daily${query ? `?${query}` : ''}`, {}, token);
    },
  },
  streaks: {
    get: (token?: string) => fetchApi<Streak>('/streaks', {}, token),
  },
  notifications: {
    list: (params?: { limit?: number; unreadOnly?: boolean }, token?: string) => {
      const query = new URLSearchParams();
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.unreadOnly) query.set('unread_only', 'true');
      const suffix = query.toString();
      return fetchApi<NotificationFeed>(`/notifications${suffix ? `?${suffix}` : ''}`, {}, token);
    },
    read: (id: string, token?: string) => fetchApi<{ message: string }>(`/notifications/${id}/read`, { method: 'POST' }, token),
    readAll: (token?: string) => fetchApi<{ message: string }>('/notifications/read-all', { method: 'POST' }, token),
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
    document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  }
}

export function clearToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    document.cookie = 'token=; path=/; max-age=0; samesite=lax';
  }
}
