import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, setToken, removeToken, getToken } from '@/lib/api';

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  initials: string;
  status: string;
  paymentStatus: string;
  mfaEnabled: boolean;
  roleId: number | null;
  roleName: string;
  orgId: number | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (details: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    companyName?: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setIsLoading(false); return; }

    api.get<{ success: boolean; data: AuthUser }>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => removeToken())
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    try { localStorage.removeItem('active_organization_id'); } catch {}
    const res = await api.post<{ success: boolean; data: { token: string; user: AuthUser } }>(
      '/auth/login',
      { email, password },
    );
    setToken(res.data.token);
    setUser(res.data.user);
  }

  async function register(details: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    companyName?: string;
  }) {
    try { localStorage.removeItem('active_organization_id'); } catch {}
    const res = await api.post<{ success: boolean; data: { token: string; user: AuthUser } }>(
      '/auth/register',
      details,
    );
    setToken(res.data.token);
    setUser(res.data.user);
  }

  async function logout() {
    try { await api.post('/auth/logout', {}); } catch {}
    removeToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
