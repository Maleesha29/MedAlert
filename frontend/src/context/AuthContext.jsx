import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = localStorage.getItem('medalert-token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      } catch {
        localStorage.removeItem('medalert-token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  const login = async (credentials) => {
    setError('');
    const { data } = await api.post('/auth/login', credentials);
    localStorage.setItem('medalert-token', data.token);
    setUser(data.user);
    return data;
  };

  const register = async (payload) => {
    setError('');
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('medalert-token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('medalert-token');
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    loading,
    error,
    setError,
    login,
    register,
    logout,
    loggedIn: Boolean(user)
  }), [user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
