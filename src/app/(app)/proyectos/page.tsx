
'use client';

import { useState, useEffect } from 'react';
import ProjectsManager from "@/components/projects-manager";
import { getProjects } from "@/app/actions";
import type { Project } from '@/types';
import { Loader2 } from 'lucide-react';

export default function ProyectosPage() {
  const [initialProjects, setInitialProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const projectsData = await getProjects();
        setInitialProjects(projectsData);
      } catch (error) {
        console.error("Failed to fetch projects data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <>
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-primary font-headline">
              Gestión de Proyectos
            </h1>
            <p className="text-muted-foreground mt-2">
              Añada, vea y gestione los proyectos de Sacde.
            </p>
          </header>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ProjectsManager initialProjects={initialProjects} />
          )}
        </div>
      </main>
    </>
  );
}
