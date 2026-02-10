import { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved session
    const savedUser = localStorage.getItem('rewear_user');
    const savedToken = localStorage.getItem('rewear_token');
    try {
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      if (savedToken) {
        setToken(savedToken);
      }
    } catch (e) {
      console.error("Failed to parse user from local storage", e);
      localStorage.removeItem('rewear_user');
      localStorage.removeItem('rewear_token');
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const result = await api.login(username, password);
    const userData = { username: result.username, role: result.role };
    setUser(userData);
    setToken(result.access_token);
    localStorage.setItem('rewear_user', JSON.stringify(userData));
    localStorage.setItem('rewear_token', result.access_token);
    return userData;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('rewear_user');
    localStorage.removeItem('rewear_token');
  };

  const isAdmin = () => user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
