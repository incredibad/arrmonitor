import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null); // null = loading, { hasUsers, authenticated, username }

  const refresh = useCallback(async () => {
    try {
      const status = await api.getAuthStatus();
      setAuth(status);
    } catch {
      setAuth({ hasUsers: true, authenticated: false, username: null });
    }
  }, []);

  useEffect(() => { refresh(); }, []);

  async function login(username, password) {
    const res = await api.login(username, password);
    await refresh();
    return res;
  }

  async function setup(username, password) {
    const res = await api.setup(username, password);
    await refresh();
    return res;
  }

  async function logout() {
    await api.logout();
    await refresh();
  }

  return (
    <AuthContext.Provider value={{ auth, login, setup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
