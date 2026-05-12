import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/services/api';

type User = {
  id: number;
  email: string;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
  profile_picture?: string;

  first_name?: string;
  last_name?: string;
  second_last_name?: string;
  birthday?: string;
  notes?: string;

  preferred_language?: string;

};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  deleteAccount: async () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('access_token');
        if (storedToken) {
          setToken(storedToken);
          const res = await api.get('/auth/me');
          setUser(res.data);
        }
      } catch {
        await AsyncStorage.removeItem('access_token');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const accessToken: string = res.data.access_token;
    await AsyncStorage.setItem('access_token', accessToken);
    setToken(accessToken);
    const meRes = await api.get('/auth/me');
    setUser(meRes.data);
  };

  const register = async (email: string, username: string, password: string, role = 'patient') => {
    await api.post('/auth/register', { email, username, password, role });
    // Ya no hacemos autologin porque el correo no está verificado aún.
  };

  const logout = async () => {
    await AsyncStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
  };

  const deleteAccount = async () => {
    if (!user) return;
    await api.delete(`/users/${user.id}`);
    await AsyncStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, deleteAccount, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
