import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, TOKEN_KEY } from '../api.js';

// Глобальное состояние авторизации (Context API): пользователь, токен, вход и выход.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY));

  // при открытии сайта восстанавливаем пользователя по сохранённому токену
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api('/user')
      .then(({ data }) => setUser(data))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setUnauthorizedHandler(() => setUser(null)); }, []);

  const authenticate = useCallback(async (path, body) => {
    const { data, token } = await api(path, { method: 'POST', body });
    localStorage.setItem(TOKEN_KEY, token);
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await api('/logout', { method: 'POST' }); } catch { /* токен мог истечь */ }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login: (body) => authenticate('/login', body),
    register: (body) => authenticate('/register', body),
    logout,
    hasRole: (...roles) => !!user && roles.includes(user.role),
  }), [user, loading, authenticate, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
