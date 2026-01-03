import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { SessionInfo } from '../types/api';

interface AuthContextType {
  token: string | null;
  sessionInfo: SessionInfo | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  login: (token: string, sessionInfo: SessionInfo) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  token: 'backoffice_token',
  session: 'backoffice_session',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.token);
  });

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.session);
    return stored ? JSON.parse(stored) : null;
  });

  const isAuthenticated = !!token && !!sessionInfo;

  // Check if user has super_admin role in any organization
  const isSuperAdmin = sessionInfo?.organizations.some(
    org => org.user_role === 'super_admin'
  ) ?? false;

  const login = useCallback((newToken: string, newSessionInfo: SessionInfo) => {
    setToken(newToken);
    setSessionInfo(newSessionInfo);
    localStorage.setItem(STORAGE_KEYS.token, newToken);
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(newSessionInfo));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setSessionInfo(null);
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.session);
  }, []);

  return (
    <AuthContext.Provider value={{
      token,
      sessionInfo,
      isAuthenticated,
      isSuperAdmin,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
