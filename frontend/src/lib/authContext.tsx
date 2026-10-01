'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Profile } from './types';
import { api } from './api';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  register: (email: string, password: string, fullName?: string, currency?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initAuth = async () => {
    if (typeof window === 'undefined') return;
    const storedToken = localStorage.getItem('twin_token');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    setToken(storedToken);
    try {
      const userData = await api.getMe();
      setUser(userData);
      if (userData.profile) {
        setProfile(userData.profile);
      } else {
        const prof = await api.getProfile();
        setProfile(prof);
      }
    } catch (err) {
      console.error('Failed to authenticate token:', err);
      localStorage.removeItem('twin_token');
      setToken(null);
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem('twin_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    if (res.user.profile) {
      setProfile(res.user.profile);
    }
  };

  const demoLogin = async () => {
    const res = await api.demoLogin();
    localStorage.setItem('twin_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    if (res.user.profile) {
      setProfile(res.user.profile);
    }
  };

  const register = async (email: string, password: string, fullName?: string, currency: string = 'USD') => {
    const res = await api.register({ email, password, full_name: fullName, currency });
    localStorage.setItem('twin_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    if (res.user.profile) {
      setProfile(res.user.profile);
    }
  };

  const logout = () => {
    localStorage.removeItem('twin_token');
    setToken(null);
    setUser(null);
    setProfile(null);
    window.location.href = '/login';
  };

  const refreshProfile = async () => {
    try {
      const prof = await api.getProfile();
      setProfile(prof);
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        isLoading,
        login,
        demoLogin,
        register,
        logout,
        refreshProfile,
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
