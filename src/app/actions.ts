
'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import type { Crew, Project, Employee, Permission, DailyLaborData, DailyLaborEntry, DailyLaborNotificationData, AbsenceType, Phase, SpecialHourType, UnproductiveHourType, User, LegacyDailyLaborEntry, EmployeeRole } from '@/types';
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

async function addDocument<T extends object>(collectionName: string, data: T): Promise<T & { id: string }> {
    try {
        const docRef = await addDoc(collection(db, collectionName), data);
        return { id: docRef.id, ...data };
    } catch (error) {
        console.error(`Error adding document to ${collectionName}:`, error);
        throw new Error('Could not write data to Firestore.');
    }
}

async function updateDocument<T extends object>(collectionName: string, docId: string, data: Partial<T>): Promise<void> {
    try {
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error(`Error updating document ${collectionName}/${docId}:`, error);
        throw new Error('Could not write data to Firestore.');
    }
}

export async function getProjects(): Promise<Project[]> {
    return readCollection<Project>('projects');
}

export async function getPermissions(): Promise<Permission[]> {
  return readCollection<Permission>('permissions');
}

export async function getDailyLabor(): Promise<DailyLaborData> {
  const laborCollection = await readCollection<{ date: string } & (DailyLaborEntry | LegacyDailyLaborEntry)>('daily-labor');
  const laborData: DailyLaborData = {};
  laborCollection.forEach(entry => {
    const { date, ...rest } = entry;
    if (!laborData[date]) {
        laborData[date] = [];
    }
    laborData[date].push(rest);
  });
  return laborData;
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

export async function getAbsenceTypes(): Promise<AbsenceType[]> {
  return readCollection<AbsenceType>('absence-types');
}

export async function getPhases(): Promise<Phase[]> {
  return readCollection<Phase>('phases');
}

export async function getSpecialHourTypes(): Promise<SpecialHourType[]> {
  return readCollection<SpecialHourType>('special-hour-types');
}

export async function getUnproductiveHourTypes(): Promise<UnproductiveHourType[]> {
    return readCollection<UnproductiveHourType>('unproductive-hour-types');
}

export async function addUnproductiveHourType(newType: Omit<UnproductiveHourType, 'id'>): Promise<UnproductiveHourType> {
    const q = query(collection(db, 'unproductive-hour-types'), where("code", "==", newType.code.toUpperCase()));
    const existing = await getDocs(q);
    if (!existing.empty) {
        throw new Error('Ya existe un tipo de hora improductiva con el mismo código.');
    }
    return addDocument('unproductive-hour-types', newType);
}

export async function deleteUnproductiveHourType(typeId: string): Promise<void> {
    await deleteDoc(doc(db, 'unproductive-hour-types', typeId));
}

export async function addSpecialHourType(newType: Omit<SpecialHourType, 'id'>): Promise<SpecialHourType> {
    const q = query(collection(db, 'special-hour-types'), where("code", "==", newType.code.toUpperCase()));
    const existing = await getDocs(q);
    if (!existing.empty) {
        throw new Error('Ya existe un tipo de hora especial con el mismo código.');
    }
    return addDocument('special-hour-types', newType);
}

export async function deleteSpecialHourType(typeId: string): Promise<void> {
    await deleteDoc(doc(db, 'special-hour-types', typeId));
}

export async function addPhase(newPhase: Omit<Phase, 'id'>): Promise<Phase> {
    const q = query(collection(db, 'phases'), where("name", "==", newPhase.name));
    const existing = await getDocs(q);
    if (!existing.empty) {
        throw new Error('Ya existe una fase con el mismo nombre.');
    }
    return addDocument('phases', newPhase);
}

export async function deletePhase(phaseId: string): Promise<void> {
    await deleteDoc(doc(db, 'phases', phaseId));
}

export async function addAbsenceType(newAbsenceType: Omit<AbsenceType, 'id'>): Promise<AbsenceType> {
    const q = query(collection(db, 'absence-types'), where("code", "==", newAbsenceType.code.toUpperCase()));
    const existing = await getDocs(q);
    if (!existing.empty) {
        throw new Error('Ya existe un tipo de ausencia con el mismo código.');
    }
    return addDocument('absence-types', newAbsenceType);
}

export async function deleteAbsenceType(absenceTypeId: string): Promise<void> {
    await deleteDoc(doc(db, 'absence-types', absenceTypeId));
}

export async function addPermission(newPermission: Omit<Permission, 'id'>): Promise<Permission> {
    return addDocument('permissions', newPermission);
}

export async function updatePermission(permissionId: string, updatedData: Partial<Omit<Permission, 'id'>>): Promise<Permission> {
    await updateDoc(doc(db, 'permissions', permissionId, updatedData));
    const updatedDoc = await readDoc<Permission>('permissions', permissionId);
    if (!updatedDoc) throw new Error("Failed to update permission.");
    return updatedDoc;
}

export async function deletePermission(permissionId: string): Promise<void> {
    await deleteDoc(doc(db, 'permissions', permissionId));
}

export async function deleteProject(projectId: string): Promise<void> {
    await deleteDoc(doc(db, 'projects', projectId));
}
