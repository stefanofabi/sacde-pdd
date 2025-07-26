
'use client';

import { useState, useEffect } from 'react';
import CrewsManager from "@/components/crews-manager";
import { getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Crew, Project, Employee, Phase } from '@/types';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function CuadrillasPage() {
  const { user, loading: authLoading } = useAuth();
  const [initialCrews, setInitialCrews] = useState<Crew[]>([]);
  const [initialProjects, setInitialProjects] = useState<Project[]>([]);
  const [initialEmployees, setInitialEmployees] = useState<Employee[]>([]);
  const [initialPhases, setInitialPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const [crewsSnapshot, projectsSnapshot, employeesSnapshot, phasesSnapshot] = await Promise.all([
          getDocs(collection(db, 'crews')),
          getDocs(collection(db, 'projects')),
          getDocs(collection(db, 'employees')),
          getDocs(collection(db, 'phases')),
        ]);
        
        const crewsData = crewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Crew[];
        const projectsData = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];
        const employeesData = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
        const phasesData = phasesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Phase[];

        setInitialCrews(crewsData);
        setInitialProjects(projectsData);
        setInitialEmployees(employeesData);
        setInitialPhases(phasesData);
      } catch (error) {
        console.error("Failed to fetch crews data:", error);
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
              Gestión de Cuadrillas
            </h1>
            <p className="text-muted-foreground mt-2">
              Añada, vea y gestione las cuadrillas de Sacde.
            </p>
          </header>
          {loading || authLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <CrewsManager
              initialCrews={initialCrews}
              initialProjects={initialProjects}
              initialEmployees={initialEmployees}
            />
          )}
        </div>
      </main>
    </>
  );
}
