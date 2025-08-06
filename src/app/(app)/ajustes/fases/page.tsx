
'use client';

import { useState, useEffect } from 'react';
import PhasesManager from "@/components/phases-manager";
import { Loader2 } from "lucide-react";
import type { Phase, Project } from '@/types';
import { useAuth } from '@/context/auth-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function FasesPage() {
  const { user, loading: authLoading } = useAuth();
  const [initialPhases, setInitialPhases] = useState<Phase[]>([]);
  const [initialProjects, setInitialProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const [phasesSnapshot, projectsSnapshot] = await Promise.all([
            getDocs(collection(db, 'phases')),
            getDocs(collection(db, 'projects'))
        ]);
        setInitialPhases(phasesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Phase[]);
        setInitialProjects(projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[]);
      } catch (error) {
        console.error("Failed to fetch phases data:", error);
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
        <PhasesManager initialPhases={initialPhases} initialProjects={initialProjects} />
      )}
    </>
  );
}
