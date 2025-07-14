
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          // Obtiene los datos del usuario de Firestore.
          const appUser = await getUserByEmail(fbUser.email!);
          setUser(appUser);
        } catch (error) {
          console.error("Failed to fetch app user, signing out.", error);
          await signOut(auth); // Desloguear si hay un error al obtener los datos.
          setUser(null);
        }
      } else {
        setUser(null);
      }
      // Marcar la carga como finalizada solo después de que todo el proceso ha terminado.
      setLoading(false);
    });

    // Limpiar el listener al desmontar el componente.
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string): Promise<void> => {
    if (!password) {
       throw new Error("Password is required.");
    }
    // Solo inicia sesión. El listener onAuthStateChanged se encargará
    // de actualizar el estado de la aplicación de forma centralizada y robusta.
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    // El listener onAuthStateChanged se encargará de poner user y firebaseUser a null.
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
