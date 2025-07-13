
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@/types';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { getUserByEmail } from '@/app/actions';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to introduce a delay
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // This delay is CRUCIAL. It gives Firebase time to propagate the auth state
        // to the point where Firestore security rules will recognize the new session.
        // Without this, Firestore queries can fail with "Missing or insufficient permissions".
        await wait(250); 
        try {
          const appUser = await getUserByEmail(fbUser.email!);
          setUser(appUser);
        } catch (error) {
          console.error("Failed to fetch app user, signing out.", error);
          await signOut(auth); // Sign out if user data can't be fetched
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string): Promise<void> => {
    if (!password) {
       throw new Error("Password is required.");
    }
    // Let the onAuthStateChanged listener handle the state updates.
    // This function's only job is to trigger the sign-in.
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    // The onAuthStateChanged listener will handle setting user and firebaseUser to null.
  };

  const isAuthenticated = !loading && !!user && !!firebaseUser;

  const authContextValue: AuthContextType = {
    firebaseUser,
    user,
    isAuthenticated,
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
