import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import apiClient from '../lib/apiClient';

interface User {
  id: string;
  email: string;
  display_name: string;
  timezone: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isNewUser: boolean;
  dismissNewUser: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  const dismissNewUser = () => setIsNewUser(false);

  // On mount, try to restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    apiClient
      .get<User>('/api/users/me')
      .then(({ data }) => setUser(data))
      .catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/api/auth/login', { email, password });

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const { data } = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/api/auth/register', { email, password, display_name: displayName });

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    setIsNewUser(true);
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/auth/logout', {
        refreshToken: localStorage.getItem('refreshToken'),
      });
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isNewUser, dismissNewUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
