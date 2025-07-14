
'use client';

import { useState, useEffect } from 'react';
import EmployeesManager from "@/components/employees-manager";
import { getEmployees, getObras } from "@/app/actions";
import type { Employee, Obra } from '@/types';
import { Loader2 } from 'lucide-react';

export default function EmpleadosPage() {
  const [initialEmployees, setInitialEmployees] = useState<Employee[]>([]);
  const [initialObras, setInitialObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [employeesData, obrasData] = await Promise.all([
          getEmployees(),
          getObras(),
        ]);
        setInitialEmployees(employeesData);
        setInitialObras(obrasData);
      } catch (error) {
        console.error("Failed to fetch employees data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <EmployeesManager initialEmployees={initialEmployees} initialObras={initialObras} />
          )}
        </div>
      </main>
    </>
  );
}
