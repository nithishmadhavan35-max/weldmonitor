import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const DEMO_USERS = {
  ADMIN: {
    name: 'Elena Rostova (System Admin)',
    email: 'admin@weldmonitor.io',
    googleId: 'google_oauth_admin_1001',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    label: 'Elena Rostova (Admin)',
  },
  OPERATOR: {
    name: 'Marcus Vance (Welding Operator)',
    email: 'operator@weldmonitor.io',
    googleId: 'google_oauth_operator_1002',
    role: 'OPERATOR',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    label: 'Marcus Vance (Operator)',
  },
  MAINTENANCE_ENGINEER: {
    name: 'David Chen (Maintenance Lead)',
    email: 'maintenance@weldmonitor.io',
    googleId: 'google_oauth_maint_1003',
    role: 'MAINTENANCE_ENGINEER',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    label: 'David Chen (Maintenance)',
  },
  PRODUCTION_MANAGER: {
    name: 'Sarah Sterling (Production Manager)',
    email: 'manager@weldmonitor.io',
    googleId: 'google_oauth_mgr_1004',
    role: 'PRODUCTION_MANAGER',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    label: 'Sarah Sterling (Manager)',
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('weldmonitor_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('weldmonitor_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
        } catch (err) {
          console.warn('Session expired or server unavailable');
          localStorage.removeItem('weldmonitor_token');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  /**
   * Primary authentication method: Google OAuth
   */
  const loginWithGoogle = async (googleProfile) => {
    const res = await api.post('/auth/google', googleProfile);
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem('weldmonitor_token', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const quickDemoLogin = async (roleKey) => {
    const demo = DEMO_USERS[roleKey];
    if (demo) {
      return loginWithGoogle({
        name: demo.name,
        email: demo.email,
        googleId: demo.googleId,
        avatar: demo.avatar,
        role: demo.role,
      });
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {}
    localStorage.removeItem('weldmonitor_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        loginWithGoogle,
        quickDemoLogin,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isOperator: user?.role === 'OPERATOR',
        isMaintenance: user?.role === 'MAINTENANCE_ENGINEER',
        isManager: user?.role === 'PRODUCTION_MANAGER',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
