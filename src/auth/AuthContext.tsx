import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { publicApi, session } from '../api/client';
import { loginMessage } from '../api/client';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  status: AuthStatus;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function statusFromSession(): AuthStatus {
  return session.hasActiveAccess() ? 'authenticated' : 'anonymous';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(session.hasSession() ? 'loading' : 'anonymous');

  useEffect(() => {
    const unsubscribe = session.subscribe(() => setStatus(statusFromSession()));
    if (session.hasSession() && !session.hasActiveAccess()) {
      void session.refresh().then(() => setStatus('authenticated')).catch(() => setStatus('anonymous'));
    }
    return unsubscribe;
  }, []);

  const context = useMemo<AuthContextValue>(() => ({
    status,
    login: async (identity, password) => {
      const { data, error } = await publicApi.POST('/v1/auth/login', {
        body: { login: identity.trim(), password },
      });
      if (!data) throw new Error(loginMessage(error));
      session.acceptTokens(data);
      setStatus('authenticated');
    },
    logout: async () => {
      try {
        await session.logout();
      } finally {
        setStatus('anonymous');
      }
    },
  }), [status]);

  return <AuthContext.Provider value={context}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth должен использоваться внутри AuthProvider');
  return value;
}
