
'use client';

import { useState, useEffect } from 'react';
import EmployeesManager from "@/components/employees-manager";
import { getEmployees, getProjects } from "@/app/actions";
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
      if (!user) return; // Esta guarda es importante, pero la dependencia lo hace más robusto.
      setLoading(true);
      try {
        const [employeesData, projectsData] = await Promise.all([
          getEmployees(),
          getProjects(),
        ]);
        setInitialEmployees(employeesData);
        setInitialProjects(projectsData);
      } catch (error) {
        console.error("Failed to fetch employees data:", error);
      } finally {
        setLoading(false);
      }
    }

    // La clave está aquí: la lógica se ejecuta solo cuando la autenticación no está cargando Y hay un usuario.
    // El array de dependencias [user, authLoading] asegura que este efecto se re-evalúe cuando el estado de auth cambie.
    if (user && !authLoading) {
      fetchData();
    } else if (!authLoading && !user) {
      // Si la autenticación terminó y no hay usuario, dejamos de cargar.
      setLoading(false);
    }

  }, [user, authLoading]); // El array de dependencias es la solución definitiva.

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
