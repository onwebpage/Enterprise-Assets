import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, setToken, removeToken, getToken, ApiError } from '@/lib/api';

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
  sessionError: string | null;
  retrySession: () => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
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
  const [sessionError, setSessionError] = useState<string | null>(null);

  const validateSession = useCallback(() => {
    const token = getToken();
    if (!token) { setUser(null); setSessionError(null); setIsLoading(false); return; }
    setIsLoading(true);
    setSessionError(null);

    api.get<{ success: boolean; data: AuthUser }>('/auth/me')
      .then((res) => { setUser(res.data); setSessionError(null); })
      .catch((error: unknown) => {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
          removeToken();
          setUser(null);
          setSessionError(null);
          return;
        }
        // Keep a valid token through network/database outages. A transient
        // /me failure must not sign the user out or discard their session.
        setUser(null);
        setSessionError(error instanceof Error ? error.message : 'Unable to verify your session.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { validateSession(); }, [validateSession]);

  async function login(email: string, password: string, rememberMe = false) {
    try { localStorage.removeItem('active_organization_id'); } catch {}
    const res = await api.post<{ success: boolean; data: { token: string; user: AuthUser } }>(
      '/auth/login',
      { email, password, rememberMe },
    );
    setToken(res.data.token);
    setUser(res.data.user);
    setSessionError(null);
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
    setSessionError(null);
  }

  async function logout() {
    try { await api.post('/auth/logout', {}); } catch {}
    removeToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, sessionError, retrySession: validateSession, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
