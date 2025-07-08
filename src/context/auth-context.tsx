
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import type { Employee, User } from '@/types';
import { getUserByEmail } from '@/app/actions';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';

type AuthenticatedUser = Employee & { role: User['role'] };

interface AuthContextType {
  user: AuthenticatedUser | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser && fbUser.email) {
        const appUser = await getUserByEmail(fbUser.email);
        if (appUser) {
          setUser(appUser);
          localStorage.setItem('user', JSON.stringify(appUser));
        } else {
          // Logged into Firebase, but no profile in our DB. Log them out.
          await signOut(auth);
          setUser(null);
          localStorage.removeItem('user');
        }
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    if (!password) return false;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      
      if (fbUser && fbUser.email) {
          const appUser = await getUserByEmail(fbUser.email);
          if (appUser) {
            setUser(appUser);
            localStorage.setItem('user', JSON.stringify(appUser));
            
            switch (appUser.role) {
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
      }
      // If appUser is not found, sign out from Firebase
      await signOut(auth);
      return false;
    } catch (error) {
      console.error("Firebase login error:", error);
      return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('user');
    setUser(null);
    setFirebaseUser(null);
    router.push(`/${locale}/login`);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, isAuthenticated: !!user, login, logout, loading }}>
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
