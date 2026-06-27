import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    authService.getProfile()
      .then(setUser)
      .catch(logout)
      .finally(() => setLoading(false));
  }, [logout]);

  useEffect(() => {
    window.addEventListener('budgetbrain:unauthorized', logout);
    return () => window.removeEventListener('budgetbrain:unauthorized', logout);
  }, [logout]);

  const login = async (email, password) => {
    const account = await authService.login({ email: String(email).trim().toLowerCase(), password });
    if (!account?.token) throw new Error('Authentication response did not include a token.');
    localStorage.setItem('token', account.token);
    setUser(account);
    return account;
  };

  const register = async (name, email, password) => {
    const account = await authService.register({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password,
    });
    if (!account?.token) throw new Error('Registration response did not include a token.');
    localStorage.setItem('token', account.token);
    setUser(account);
    return account;
  };

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
