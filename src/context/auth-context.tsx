
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';
import { getUserByEmail } from '@/app/actions';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
        if (firebaseUser && firebaseUser.email) {
            const appUser = await getUserByEmail(firebaseUser.email);
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
    };

    fetchUserData();
  }, [firebaseUser]);

  const login = async (email: string, password?: string): Promise<boolean> => {
    if (!password) return false;
    
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting the firebaseUser, which triggers the other useEffect
      router.push('/dashboard');
      return true;
    } catch (error: any) {
      console.error("Firebase login error:", error.code);
      setLoading(false); 
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
  
  const authContextValue: AuthContextType = {
    user,
    firebaseUser,
    isAuthenticated: !!user,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
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
