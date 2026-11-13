import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, setStoredToken } from '../lib/api';
import type { User } from '../types';

const EXPLICIT_LOGOUT_KEY = 'indeecheck_explicit_logout';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: (email?: string) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: string;
    title?: string;
    department?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (payload: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const res = await apiFetch<{ user: User }>('/api/auth/me');
        if (!cancelled) {
          setUser(res.user);
          setLoading(false);
        }
      } catch {
        // Check if user explicitly signed out; if not, auto-bootstrap demo workspace on first load
        // so the app feels immediately alive while retaining real JWT authentication.
        let explicitlyLoggedOut = false;
        try {
          explicitlyLoggedOut = localStorage.getItem(EXPLICIT_LOGOUT_KEY) === 'true';
        } catch {
          explicitlyLoggedOut = false;
        }

        if (!explicitlyLoggedOut) {
          try {
            const demoRes = await apiFetch<{ user: User; token: string }>('/api/auth/demo-login', {
              method: 'POST',
              body: JSON.stringify({ email: 'zoning@independenceia.gov' }),
            });
            setStoredToken(demoRes.token);
            if (!cancelled) {
              setUser(demoRes.user);
              setLoading(false);
            }
            return;
          } catch {
            // Fall through to unauthenticated login view
          }
        }

        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    bootstrap();

    const handleUnauthorized = () => {
      setStoredToken(null);
      setUser(null);
    };
    window.addEventListener('indeecheck:unauthorized', handleUnauthorized);

    return () => {
      cancelled = true;
      window.removeEventListener('indeecheck:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    try {
      localStorage.removeItem(EXPLICIT_LOGOUT_KEY);
    } catch {
      // ignore
    }
    setUser(res.user);
  }, []);

  const demoLogin = useCallback(async (email = 'zoning@independenceia.gov') => {
    const res = await apiFetch<{ user: User; token: string }>('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    setStoredToken(res.token);
    try {
      localStorage.removeItem(EXPLICIT_LOGOUT_KEY);
    } catch {
      // ignore
    }
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      role: string;
      title?: string;
      department?: string;
    }) => {
      const res = await apiFetch<{ user: User; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setStoredToken(res.token);
      try {
        localStorage.removeItem(EXPLICIT_LOGOUT_KEY);
      } catch {
        // ignore
      }
      setUser(res.user);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setStoredToken(null);
    try {
      localStorage.setItem(EXPLICIT_LOGOUT_KEY, 'true');
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload: Partial<User>) => {
    const res = await apiFetch<{ user: User }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    setUser(res.user);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, demoLogin, register, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
