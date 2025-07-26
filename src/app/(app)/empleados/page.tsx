
'use client';

import { useState, useEffect } from 'react';
import EmployeesManager from "@/components/employees-manager";
import { getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Employee, Project } from '@/types';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function EmpleadosPage() {
  const { user, loading: authLoading } = useAuth();
  const [initialEmployees, setInitialEmployees] = useState<Employee[]>([]);
  const [initialProjects, setInitialProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const [employeesSnapshot, projectsSnapshot] = await Promise.all([
          getDocs(collection(db, 'employees')),
          getDocs(collection(db, 'projects'))
        ]);
        
        const employeesData = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
        const projectsData = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];

        setInitialEmployees(employeesData);
        setInitialProjects(projectsData);
      } catch (error) {
        console.error("Failed to fetch employees or projects data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading && user) {
      fetchData();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  return (
    <>
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-primary font-headline">
              Gestión de Empleados
            </h1>
            <p className="text-muted-foreground mt-2">
              Añada, vea y gestione los empleados de Sacde.
            </p>
          </header>
          {loading || authLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <EmployeesManager initialEmployees={initialEmployees} initialProjects={initialProjects} />
          )}
        </div>
      </main>
    </>
  );
}
