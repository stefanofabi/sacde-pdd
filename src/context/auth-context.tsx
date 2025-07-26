
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, Role } from '@/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, query, where, doc, getDoc, addDoc } from 'firebase/firestore';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: (User & { role: Role | null }) | null; 
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  registerUser: (email: string, password?: string, additionalData?: { firstName: string; lastName: string }) => Promise<void>;
  logout: () => void;
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

        if (userData.roleId && userData.roleId !== '') {
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
  
  const registerUser = async (email: string, password?: string, additionalData?: { firstName: string; lastName: string }): Promise<void> => {
    if (!password) {
      throw new Error("Password is required for registration.");
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Now create the user document in Firestore
    const dataToSave = {
      firstName: additionalData?.firstName || '',
      lastName: additionalData?.lastName || '',
      email: email.toLowerCase(),
      roleId: '', // Register user without a role initially
      is_superuser: false,
      authUid: userCredential.user.uid,
    };

    try {
      await addDoc(collection(db, "users"), dataToSave);
    } catch (firestoreError) {
      // If Firestore write fails, delete the Auth user to keep things consistent
      await userCredential.user.delete();
      console.error("Error creating user in Firestore, rolling back Auth user:", firestoreError);
      throw new Error('Error al guardar el usuario en la base de datos después de crearlo en autenticación.');
    }
  };


  const logout = async () => {
    await signOut(auth);
  };

  const authContextValue: AuthContextType = {
    firebaseUser,
    user,
    loading,
    login,
    registerUser,
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

    