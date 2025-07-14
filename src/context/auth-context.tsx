
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@/types';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { getUserByEmail } from '@/app/actions';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null | undefined; // undefined: initial check, null: not logged in, User: logged in
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null | undefined>(undefined); // Start as undefined

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const appUser = await getUserByEmail(fbUser.email!);
          setUser(appUser);
        } catch (error) {
          console.error("Failed to fetch app user, signing out.", error);
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string): Promise<void> => {
    if (!password) {
       throw new Error("Password is required.");
    }
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the rest
  };

  const logout = async () => {
    await signOut(auth);
    // onAuthStateChanged will set user to null
  };

  const authContextValue: AuthContextType = {
    firebaseUser,
    user,
    login,
    logout,
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
