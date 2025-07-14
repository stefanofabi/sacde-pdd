
'use client';

import { useState, useEffect } from 'react';
import CrewsManager from "@/components/crews-manager";
import { getCrews, getObras, getEmployees, getPhases } from "@/app/actions";
import type { Crew, Obra, Employee, Phase } from '@/types';
import { Loader2 } from 'lucide-react';

export default function CuadrillasPage() {
  const [initialCrews, setInitialCrews] = useState<Crew[]>([]);
  const [initialObras, setInitialObras] = useState<Obra[]>([]);
  const [initialEmployees, setInitialEmployees] = useState<Employee[]>([]);
  const [initialPhases, setInitialPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [crewsData, obrasData, employeesData, phasesData] = await Promise.all([
          getCrews(),
          getObras(),
          getEmployees(),
          getPhases(),
        ]);
        setInitialCrews(crewsData);
        setInitialObras(obrasData);
        setInitialEmployees(employeesData);
        setInitialPhases(phasesData);
      } catch (error) {
        console.error("Failed to fetch crews data:", error);
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
              Gestión de Cuadrillas
            </h1>
            <p className="text-muted-foreground mt-2">
              Añada, vea y gestione las cuadrillas de Sacde.
            </p>
          </header>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <CrewsManager
              initialCrews={initialCrews}
              initialObras={initialObras}
              initialEmployees={initialEmployees}
              initialPhases={initialPhases}
            />
          )}
        </div>
      </main>
    </>
  );
}
