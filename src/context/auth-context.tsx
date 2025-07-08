
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import type { Employee } from '@/types';
import { authenticateUser } from '@/app/actions';

interface AuthContextType {
  user: Employee | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    // For this prototype, the password is 'password' for everyone
    const employee = await authenticateUser(email, 'password');
    
    if (employee) {
      localStorage.setItem('user', JSON.stringify(employee));
      setUser(employee);

      // Redirect based on role
      switch (employee.role) {
        case 'crew_manager':
          router.push(`/${locale}/cuadrillas`);
          break;
        case 'admin':
          router.push(`/${locale}/estadisticas`);
          break;
        case 'recursos_humanos':
          router.push(`/${locale}/empleados`);
          break;
        default:
          router.push(`/${locale}/partes-diarios`);
          break;
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push(`/${locale}/login`);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
