import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, setAccessToken } from '../services/apiClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    try {
      const refresh = await apiClient.post('/auth/refresh');
      setAccessToken(refresh.data.data.accessToken);
      setUser(refresh.data.data.user);
    } catch {
      setAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    setAccessToken(response.data.data.accessToken);
    setUser(response.data.data.user);
    return response.data.data.user;
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({ user, loading, login, logout, restoreSession }),
    [user, loading, restoreSession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
