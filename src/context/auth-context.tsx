
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null | undefined; // undefined: initial check, null: not logged in, User: logged in
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function getUserByEmail(email: string): Promise<User | null> {
    try {
        const usersRef = collection(db, 'users');
        // Always search for the lowercase version of the email.
        const q = query(usersRef, where("email", "==", email.toLowerCase()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log(`No user found with email: ${email}`);
            return null;
        }

        const userDoc = querySnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() } as User;
    } catch (error) {
        // This will now log the detailed permission error in the browser console
        console.error(`Error fetching user by email ${email}:`, error);
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null | undefined>(undefined); // Start as undefined

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
          try {
            // The query now runs on the client, where the auth state is valid
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
    // The onAuthStateChanged listener will handle fetching user data and setting state
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
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
