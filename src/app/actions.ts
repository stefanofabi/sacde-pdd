
'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import type { Crew, Project, Employee, DailyLaborData, DailyLaborEntry, DailyLaborNotificationData, Phase, SpecialHourType, UnproductiveHourType, User, LegacyDailyLaborEntry, EmployeeRole } from '@/types';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase-admin'; // Assumes admin app is initialized


// Initialize admin auth
const adminAuth = getAdminAuth(adminApp);


export async function createUser(userData: Omit<User, 'id' | 'authUid'>, password: string): Promise<User> {
  const { nombre, apellido, email, role } = userData;

  // 1. Check if user exists in Firestore
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where("email", "==", email.toLowerCase()));
  const existingFirestoreUser = await getDocs(q);
  if (!existingFirestoreUser.empty) {
    throw new Error('Ya existe un usuario con este correo electrónico en la base de datos.');
  }

  // 2. Create user in Firebase Auth
  let createdAuthUser;
  try {
    createdAuthUser = await adminAuth.createUser({
      email: email.toLowerCase(),
      password: password,
      displayName: `${nombre} ${apellido}`,
      disabled: false,
    });
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      throw new Error('Ya existe un usuario con este correo electrónico en el sistema de autenticación.');
    }
    if (error.code === 'auth/invalid-password') {
        throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }
    console.error("Error creating user in Firebase Auth:", error);
    throw new Error('Error al crear el usuario en el sistema de autenticación.');
  }

  // 3. Create user in Firestore
  const dataToSave = {
    nombre,
    apellido,
    email: email.toLowerCase(),
    role,
    authUid: createdAuthUser.uid, // Store the Auth UID
  };

  try {
    const docRef = await addDoc(collection(db, "users"), dataToSave);
    return { id: docRef.id, ...dataToSave } as User;
  } catch (firestoreError) {
    // Cleanup: If Firestore write fails, delete the Auth user
    await adminAuth.deleteUser(createdAuthUser.uid);
    console.error("Error creating user in Firestore, rolling back Auth user:", firestoreError);
    throw new Error('Error al guardar el usuario en la base de datos después de crearlo en autenticación.');
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const userDocRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    throw new Error("El usuario no existe en la base de datos.");
  }
  
  const userData = userDoc.data() as User;
  const authUid = userData.authUid;

  // 1. Delete from Firestore
  await deleteDoc(userDocRef);

  // 2. Delete from Firebase Auth, if authUid exists
  if (authUid) {
    try {
      await adminAuth.deleteUser(authUid);
    } catch (error: any) {
      console.error(`Failed to delete user from Auth with UID: ${authUid}. They might have been deleted already.`, error);
      // We don't re-throw here, as the primary goal (deleting from DB) succeeded.
      // You might want to add more robust logging or handling for this case.
    }
  } else {
    console.warn(`User with ID ${userId} was deleted from Firestore, but had no authUid to delete from Firebase Auth.`);
  }
}


async function readCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const q = query(collection(db, collectionName));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (error) {
    console.error(`Error reading collection ${collectionName}:`, error);
    throw new Error('Could not read data from Firestore.');
  }
}

async function readDoc<T>(collectionName: string, docId: string): Promise<T | null> {
    try {
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as T;
        }
        return null;
    } catch (error) {
        console.error(`Error reading document ${collectionName}/${docId}:`, error);
        throw new Error('Could not read data from Firestore.');
    }
}

export async function getDailyLaborNotifications(): Promise<DailyLaborNotificationData> {
   const notificationsCollection = await readCollection<{ date: string; crewId: string; notified: boolean; notifiedAt: string }>('daily-labor-notifications');
    const notificationsData: DailyLaborNotificationData = {};
    notificationsCollection.forEach(entry => {
        const { date, crewId, notified, notifiedAt } = entry;
        if (!notificationsData[date]) {
            notificationsData[date] = {};
        }
        notificationsData[date][crewId] = { notified, notifiedAt };
    });
    return notificationsData;
}
