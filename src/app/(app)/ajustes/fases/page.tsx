
'use client';

import { useState, useEffect } from 'react';
import PhasesManager from "@/components/phases-manager";
import { Loader2 } from "lucide-react";
import type { Phase, Project, Crew, DailyReport, DailyLaborEntry } from '@/types';
import { useAuth } from '@/context/auth-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function FasesPage() {
  const { user, loading: authLoading } = useAuth();
  const [initialPhases, setInitialPhases] = useState<Phase[]>([]);
  const [initialProjects, setInitialProjects] = useState<Project[]>([]);
  const [initialCrews, setInitialCrews] = useState<Crew[]>([]);
  const [initialDailyReports, setInitialDailyReports] = useState<DailyReport[]>([]);
  const [initialDailyLabor, setInitialDailyLabor] = useState<DailyLaborEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const [
          phasesSnapshot, 
          projectsSnapshot, 
          crewsSnapshot, 
          dailyReportsSnapshot,
          dailyLaborSnapshot,
        ] = await Promise.all([
            getDocs(collection(db, 'phases')),
            getDocs(collection(db, 'projects')),
            getDocs(collection(db, 'crews')),
            getDocs(collection(db, 'daily-reports')),
            getDocs(collection(db, 'daily-labor')),
        ]);
        setInitialPhases(phasesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Phase[]);
        setInitialProjects(projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[]);
        setInitialCrews(crewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Crew[]);
        setInitialDailyReports(dailyReportsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DailyReport[]);
        setInitialDailyLabor(dailyLaborSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DailyLaborEntry[]);
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
        <PhasesManager 
          initialPhases={initialPhases} 
          initialProjects={initialProjects}
          initialCrews={initialCrews}
          initialDailyReports={initialDailyReports}
          initialDailyLabor={initialDailyLabor}
        />
      )}
    </>
  );
}
