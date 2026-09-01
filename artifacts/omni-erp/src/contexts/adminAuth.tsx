import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

const ADMIN_TOKEN_KEY = 'admin_token';
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export interface AdminUser {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  getToken: () => string | null;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  const res = await fetch(`${BASE}/api/admin${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      window.dispatchEvent(new Event('admin-session-revoked'));
    }
    throw new Error(json.error ?? `Request failed (${res.status})`);
  }
  return json as T;
}

export async function adminDownload(path: string): Promise<Blob> {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  const res = await fetch(`${BASE}/api/admin${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? `Download failed (${res.status})`);
  }
  return res.blob();
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) { setIsLoading(false); return; }
    adminFetch<{ success: boolean; data: { id: number; username: string; display_name: string; email: string | null } }>('/auth/me')
      .then(r => setAdmin({ id: r.data.id, username: r.data.username, displayName: r.data.display_name, email: r.data.email }))
      .catch(() => localStorage.removeItem(ADMIN_TOKEN_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const handleRevokedSession = () => setAdmin(null);
    window.addEventListener('admin-session-revoked', handleRevokedSession);
    return () => window.removeEventListener('admin-session-revoked', handleRevokedSession);
  }, []);

  async function login(username: string, password: string) {
    const r = await adminFetch<{ success: boolean; data: { token: string; admin: AdminUser } }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }
    );
    localStorage.setItem(ADMIN_TOKEN_KEY, r.data.token);
    setAdmin(r.data.admin);
  }

  function logout() {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) {
      fetch(`${BASE}/api/admin/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdmin(null);
  }

  return (
    <AdminAuthContext.Provider value={{ admin, isLoading, login, logout, getToken: () => localStorage.getItem(ADMIN_TOKEN_KEY) }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}

export { adminFetch };
