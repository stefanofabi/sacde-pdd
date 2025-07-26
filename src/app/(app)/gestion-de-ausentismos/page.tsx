
'use client';

import { useState, useEffect } from 'react';
import PermissionsManager from "@/components/permissions-manager";
import type { Permission, Employee, AbsenceType } from '@/types';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function GestionDeAusentismosPage() {
  const { user, loading: authLoading } = useAuth();
  const [initialPermissions, setInitialPermissions] = useState<Permission[]>([]);
  const [initialEmployees, setInitialEmployees] = useState<Employee[]>([]);
  const [initialAbsenceTypes, setInitialAbsenceTypes] = useState<AbsenceType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const [permissionsSnapshot, employeesSnapshot, absenceTypesSnapshot] = await Promise.all([
          getDocs(collection(db, 'permissions')),
          getDocs(collection(db, 'employees')),
          getDocs(collection(db, 'absence-types')),
        ]);
        setInitialPermissions(permissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Permission[]);
        setInitialEmployees(employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[]);
        setInitialAbsenceTypes(absenceTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AbsenceType[]);
      } catch (error) {
        console.error("Failed to fetch permissions data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    if (user && !authLoading) {
      fetchData();
    }
  }, [user, authLoading]);

  return (
    <>
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-primary font-headline">
              Gestión de Ausentismos
            </h1>
            <p className="text-muted-foreground mt-2">
              Cargue, vea y gestione los ausentismos de los empleados de Sacde.
            </p>
          </header>
          {loading || authLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <PermissionsManager
              initialPermissions={initialPermissions}
              initialEmployees={initialEmployees}
              initialAbsenceTypes={initialAbsenceTypes}
            />
          )}
        </div>
      </main>
    </>
  );
}
