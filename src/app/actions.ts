
'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, writeBatch, documentId } from 'firebase/firestore';
import type { Crew, AttendanceData, Obra, Employee, AttendanceEntry, Permission, DailyLaborData, DailyLaborEntry, DailyLaborNotificationData, AbsenceType, Phase, CrewPhaseAssignment, SpecialHourType, UnproductiveHourType, User, LegacyDailyLaborEntry } from '@/types';
import { format, subDays } from 'date-fns';

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

async function deleteDocument(collectionName: string, docId: string): Promise<void> {
    try {
        const docRef = doc(db, collectionName, docId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error(`Error deleting document ${collectionName}/${docId}:`, error);
        throw new Error('Could not write data to Firestore.');
    }
}

export async function getUsers(): Promise<User[]> {
  return readCollection<User>('users');
}

export async function getCrews(): Promise<Crew[]> {
  return readCollection<Crew>('crews');
}

export async function getEmployees(): Promise<Employee[]> {
  return readCollection<Employee>('employees');
}

export async function getObras(): Promise<Obra[]> {
  return readCollection<Obra>('obras');
}

export async function getAttendance(): Promise<AttendanceData> {
  const attendanceCollection = await readCollection<{ date: string } & AttendanceEntry>('attendance');
  const attendanceData: AttendanceData = {};
  attendanceCollection.forEach(entry => {
    const { date, ...rest } = entry;
    if (!attendanceData[date]) {
        attendanceData[date] = [];
    }
    attendanceData[date].push(rest);
  });
  return attendanceData;
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

export async function getUserByEmail(email: string): Promise<(Employee & { role: User['role'] }) | null> {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("email", "==", email.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }

    const userDoc = querySnapshot.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() } as User;

    if (user && user.employeeId) {
        const employee = await readDoc<Employee>('employees', user.employeeId);
        if (employee) {
            return { ...employee, role: user.role };
        }
    }

    return null;
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
    await deleteDocument('unproductive-hour-types', typeId);
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
    await deleteDocument('special-hour-types', typeId);
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
    await deleteDocument('phases', phaseId);
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
    await deleteDocument('absence-types', absenceTypeId);
}

export async function moveEmployeeBetweenCrews(dateKey: string, employeeId: string, sourceCrewId: string, destinationCrewId: string): Promise<void> {
  const dailyLaborRef = collection(db, 'daily-labor');
  const q = query(dailyLaborRef, where("date", "==", dateKey), where("crewId", "==", sourceCrewId), where("employeeId", "==", employeeId));
  const snapshot = await getDocs(q);
  
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
  });

  const newEntry = {
      date: dateKey,
      employeeId,
      crewId: destinationCrewId,
      productiveHours: {},
      unproductiveHours: {},
      absenceReason: null,
      specialHours: {},
      manual: true,
  };
  const newDocRef = doc(collection(db, "daily-labor"));
  batch.set(newDocRef, newEntry);
  
  await batch.commit();
}


export async function notifyDailyLabor(dateKey: string, crewId: string): Promise<void> {
  const notificationsRef = collection(db, 'daily-labor-notifications');
  const q = query(notificationsRef, where("date", "==", dateKey), where("crewId", "==", crewId));
  const snapshot = await getDocs(q);
  
  const notificationData = {
    date: dateKey,
    crewId,
    notified: true,
    notifiedAt: new Date().toISOString(),
  };

  if (snapshot.empty) {
    await addDoc(notificationsRef, notificationData);
  } else {
    await updateDoc(snapshot.docs[0].ref, notificationData);
  }
}

export async function saveDailyLabor(dateKey: string, crewId: string, laborData: Omit<DailyLaborEntry, 'id' | 'crewId'>[]): Promise<void> {
    const batch = writeBatch(db);
    const laborRef = collection(db, 'daily-labor');
    const q = query(laborRef, where("date", "==", dateKey), where("crewId", "==", crewId));
    const oldDocs = await getDocs(q);
    oldDocs.forEach(doc => batch.delete(doc.ref));

    laborData.forEach(data => {
        const newDocRef = doc(laborRef);
        batch.set(newDocRef, { date: dateKey, crewId, ...data });
    });

    await batch.commit();
}

export async function addCrew(newCrew: Omit<Crew, 'id'>): Promise<Crew> {
  return addDocument('crews', newCrew);
}

export async function updateCrew(crewId: string, updatedCrewData: Partial<Omit<Crew, 'id'>>): Promise<Crew> {
    await updateDocument('crews', crewId, updatedCrewData);
    const updatedDoc = await readDoc<Crew>('crews', crewId);
    if (!updatedDoc) throw new Error("Failed to update crew.");
    return updatedDoc;
}

export async function addEmployee(newEmployee: Omit<Employee, 'id'>): Promise<Employee> {
    const q = query(collection(db, 'employees'), where("legajo", "==", newEmployee.legajo));
    const existing = await getDocs(q);
    if (!existing.empty) {
        throw new Error('Ya existe un empleado con el mismo legajo.');
    }
    return addDocument('employees', newEmployee);
}

export async function updateEmployee(employeeId: string, updatedData: Partial<Omit<Employee, 'id'>>): Promise<Employee> {
    await updateDocument('employees', employeeId, updatedData);
    const updatedDoc = await readDoc<Employee>('employees', employeeId);
    if (!updatedDoc) throw new Error("Failed to update employee.");
    return updatedDoc;
}

export async function deleteCrew(crewId: string): Promise<void> {
    await deleteDocument('crews', crewId);
}

export async function deleteEmployee(employeeId: string): Promise<void> {
    await deleteDocument('employees', employeeId);
}

export async function addObra(newObra: Omit<Obra, 'id'>): Promise<Obra> {
    const q = query(collection(db, 'obras'), where("identifier", "==", newObra.identifier.toUpperCase()));
    const existing = await getDocs(q);
    if (!existing.empty) {
        throw new Error('Ya existe una obra con el mismo identificador.');
    }
    return addDocument('obras', newObra);
}

export async function deleteObra(obraId: string): Promise<void> {
    await deleteDocument('obras', obraId);
}

export async function updateAttendanceSentStatus(dateKey: string, attendanceId: string, sent: boolean): Promise<AttendanceEntry> {
    const attendanceRef = collection(db, 'attendance');
    const q = query(attendanceRef, where("date", "==", dateKey), where(documentId(), "==", attendanceId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        throw new Error('Attendance entry not found.');
    }

    const docToUpdate = snapshot.docs[0];
    const sentAt = sent ? new Date().toISOString() : null;
    await updateDoc(docToUpdate.ref, { sent, sentAt });

    const updatedData = (await getDoc(docToUpdate.ref)).data();
    return { id: docToUpdate.id, ...updatedData } as AttendanceEntry;
}

export async function addAttendanceRequest(dateKey: string, crewId: string, responsibleId: string): Promise<AttendanceEntry> {
  const newEntryData = {
      date: dateKey,
      crewId,
      responsibleId,
      sent: false,
      sentAt: null,
  };

  const docRef = await addDoc(collection(db, 'attendance'), newEntryData);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { date, ...rest } = newEntryData;
  return { id: docRef.id, ...rest };
}

export async function deleteAttendanceRequest(dateKey: string, attendanceId: string): Promise<void> {
    await deleteDocument('attendance', attendanceId);
}

export async function clonePreviousDayAttendance(dateKey: string): Promise<AttendanceData> {
    const targetDate = new Date(dateKey);
    const previousDate = subDays(targetDate, 1);
    const previousDateKey = format(previousDate, "yyyy-MM-dd");

    const q = query(collection(db, 'attendance'), where("date", "==", previousDateKey));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);

    const currentEntriesQuery = query(collection(db, 'attendance'), where("date", "==", dateKey));
    const currentSnapshot = await getDocs(currentEntriesQuery);
    currentSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    snapshot.docs.forEach(docSnap => {
        const entry = docSnap.data();
        const newEntry = {
            date: dateKey,
            crewId: entry.crewId,
            responsibleId: entry.responsibleId,
            sent: false,
            sentAt: null,
        };
        const newDocRef = doc(collection(db, "attendance"));
        batch.set(newDocRef, newEntry);
    });

    await batch.commit();
    return getAttendance();
}

export async function addPermission(newPermission: Omit<Permission, 'id'>): Promise<Permission> {
    return addDocument('permissions', newPermission);
}

export async function updatePermission(permissionId: string, updatedData: Partial<Omit<Permission, 'id'>>): Promise<Permission> {
    await updateDocument('permissions', permissionId, updatedData);
    const updatedDoc = await readDoc<Permission>('permissions', permissionId);
    if (!updatedDoc) throw new Error("Failed to update permission.");
    return updatedDoc;
}

export async function deletePermission(permissionId: string): Promise<void> {
    await deleteDocument('permissions', permissionId);
}

export async function addUser(newUser: Omit<User, 'id'>): Promise<User> {
    const q = query(collection(db, 'users'), where("email", "==", newUser.email.toLowerCase()));
    const existing = await getDocs(q);
    if (!existing.empty) {
        throw new Error('Ya existe un usuario con este correo electrónico.');
    }
    return addDocument('users', newUser);
}

export async function updateUser(userId: string, updatedData: Partial<Omit<User, 'id'>>): Promise<User> {
    if (updatedData.email) {
        const q = query(collection(db, 'users'), where("email", "==", updatedData.email.toLowerCase()));
        const existing = await getDocs(q);
        if (!existing.empty && existing.docs[0].id !== userId) {
            throw new Error('Ya existe otro usuario con este correo electrónico.');
        }
    }

    await updateDocument('users', userId, updatedData);
    const updatedDoc = await readDoc<User>('users', userId);
    if (!updatedDoc) throw new Error("Failed to update user.");
    return updatedDoc;
}
