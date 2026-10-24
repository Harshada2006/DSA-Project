import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('econexus_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('econexus_token') || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && !user) {
      setLoading(true);
      api
        .getMe()
        .then((userData) => {
          setUser(userData);
          localStorage.setItem('econexus_user', JSON.stringify(userData));
        })
        .catch((err) => {
          console.warn('Session check:', err?.message);
          if (err?.message && err.message.includes('401')) {
            logout();
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [token]);

  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    setLoading(false);
    localStorage.setItem('econexus_token', newToken);
    localStorage.setItem('econexus_user', JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setLoading(false);
    api.logout();
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!user && !!token,
        isCitizen: user?.role === 'CITIZEN',
        isWorker: user?.role === 'WORKER',
        isAdmin: user?.role === 'ORGANIZATION_ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
