
'use client';

import { useState, useEffect } from 'react';
import ProjectsManager from '@/components/projects-manager';
import { Loader2 } from "lucide-react";
import type { Project } from '@/types';
import { useAuth } from '@/context/auth-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ProyectosPage() {
  const { user, loading: authLoading } = useAuth();
  const [initialProjects, setInitialProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const projectsSnapshot = await getDocs(collection(db, 'projects'));
        setInitialProjects(projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[]);
      } catch (error) {
        console.error("Failed to fetch projects data:", error);
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
      {loading || authLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <ProjectsManager initialProjects={initialProjects} />
      )}
    </>
  );
}
