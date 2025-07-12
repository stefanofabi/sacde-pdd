
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Employee, User } from '@/types';
import { getUserByEmail } from '@/app/actions';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser, createUserWithEmailAndPassword } from 'firebase/auth';

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
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser && fbUser.email) {
        const appUser = await getUserByEmail(fbUser.email);
        if (appUser) {
          setUser(appUser);
        } else {
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
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
            switch (appUser.role) {
              case 'crew_manager':
                router.push(`/cuadrillas`);
                break;
              case 'admin':
                router.push(`/estadisticas`);
                break;
              case 'recursos_humanos':
                router.push(`/empleados`);
                break;
              case 'invitado':
                router.push(`/partes-diarios`);
                break;
              default:
                router.push(`/partes-diarios`);
                break;
            }
            return true;
          }
      }
      await signOut(auth);
      return false;
    } catch (error: any) {
      console.error("Firebase login error:", error);
      if (error.code === 'auth/invalid-credential') {
         console.warn(`Could not sign in. Invalid credentials.`);
      }
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
        console.error("Error signing out from Firebase:", error);
    } finally {
        setUser(null);
        setFirebaseUser(null);
        router.push(`/login`);
    }
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
