
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, Role } from '@/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, query, where, addDoc, doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: (User & { role: Role | null }) | null; 
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  registerUser: (userData: Omit<User, 'id' | 'authUid'>, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function getFullUser(email: string): Promise<(User & { role: Role | null }) | null> {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("email", "==", email.toLowerCase()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log(`No user found with email: ${email}`);
            return null;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = { id: userDoc.id, ...userDoc.data() } as User;

        if (userData.roleId) {
            const roleDocRef = doc(db, 'roles', userData.roleId);
            const roleDoc = await getDoc(roleDocRef);
            if (roleDoc.exists()) {
                return { ...userData, role: { id: roleDoc.id, ...roleDoc.data() } as Role };
            }
        }
        
        return { ...userData, role: null };
    } catch (error) {
        console.error(`Error fetching user by email ${email}:`, error);
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<(User & { role: Role | null }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser && fbUser.email) {
          try {
            const appUser = await getFullUser(fbUser.email);
            setUser(appUser);
          } catch (error) {
            console.error("Failed to fetch app user, signing out.", error);
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

  const login = async (email: string, password?: string): Promise<void> => {
    if (!password) {
       throw new Error("Password is required.");
    }
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const registerUser = async (userData: Omit<User, 'id' | 'authUid'>, password: string): Promise<void> => {
    const lowerCaseEmail = userData.email.toLowerCase();

    const userExistsQuery = query(collection(db, 'users'), where("email", "==", lowerCaseEmail));
    const existingUserSnapshot = await getDocs(userExistsQuery);
    if (!existingUserSnapshot.empty) {
        throw new Error('El correo electrónico ya está registrado en la base de datos.');
    }

    let authUser: FirebaseUser;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, lowerCaseEmail, password);
        authUser = userCredential.user;
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            throw new Error('El correo electrónico ya está registrado en el sistema de autenticación.');
        }
        if (error.code === 'auth/weak-password') {
            throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }
        throw new Error(`Error al crear el usuario en Firebase: ${error.message}`);
    }

    await addDoc(collection(db, 'users'), {
        ...userData,
        email: lowerCaseEmail,
        authUid: authUser.uid,
    });
  }

  const authContextValue: AuthContextType = {
    firebaseUser,
    user,
    loading,
    login,
    logout,
    registerUser
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
