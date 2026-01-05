import { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved session
    const savedUser = localStorage.getItem('rewear_user');
    try {
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error("Failed to parse user from local storage", e);
      localStorage.removeItem('rewear_user');
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const result = await api.login(username, password);
    setUser(result);
    localStorage.setItem('rewear_user', JSON.stringify(result));
    return result;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('rewear_user');
  };

  const isAdmin = () => user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, loading }}>
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
