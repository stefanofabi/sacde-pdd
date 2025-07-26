
'use client';

import { useState, useEffect } from 'react';
import StatisticsDashboard from "@/components/statistics-dashboard";
import { BarChart3, Loader2 } from "lucide-react";
import type { Crew, Employee, DailyLaborData, Project, AbsenceType, SpecialHourType, UnproductiveHourType, DailyLaborEntry, LegacyDailyLaborEntry } from '@/types';
import { useAuth } from '@/context/auth-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function EstadisticasPage() {
  const { user, loading: authLoading } = useAuth();
  const [crews, setCrews] = useState<Crew[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dailyLabor, setDailyLabor] = useState<DailyLaborData>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceType[]>([]);
  const [specialHourTypes, setSpecialHourTypes] = useState<SpecialHourType[]>([]);
  const [unproductiveHourTypes, setUnproductiveHourTypes] = useState<UnproductiveHourType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const [
          crewsSnapshot,
          employeesSnapshot,
          dailyLaborSnapshot,
          projectsSnapshot,
          absenceTypesSnapshot,
          specialHourTypesSnapshot,
          unproductiveHourTypesSnapshot
        ] = await Promise.all([
          getDocs(collection(db, 'crews')),
          getDocs(collection(db, 'employees')),
          getDocs(collection(db, 'daily-labor')),
          getDocs(collection(db, 'projects')),
          getDocs(collection(db, 'absence-types')),
          getDocs(collection(db, 'special-hour-types')),
          getDocs(collection(db, 'unproductive-hour-types')),
        ]);
        
        const laborData: DailyLaborData = {};
        dailyLaborSnapshot.docs.forEach(doc => {
            const entry = { id: doc.id, ...doc.data() } as { date: string } & (DailyLaborEntry | LegacyDailyLaborEntry);
            const { date, ...rest } = entry;
            if (!laborData[date]) {
                laborData[date] = [];
            }
            laborData[date].push(rest);
        });

        setCrews(crewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Crew[]);
        setEmployees(employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[]);
        setDailyLabor(laborData);
        setProjects(projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[]);
        setAbsenceTypes(absenceTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AbsenceType[]);
        setSpecialHourTypes(specialHourTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SpecialHourType[]);
        setUnproductiveHourTypes(unproductiveHourTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UnproductiveHourType[]);

      } catch (error) {
        console.error("Failed to fetch statistics data:", error);
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
            <h1 className="text-4xl font-bold text-primary font-headline flex items-center gap-3">
              <BarChart3 className="h-10 w-10" />
              Estadísticas
            </h1>
            <p className="text-muted-foreground mt-2">
              Analice los datos de asistencia y productividad con filtros y gráficos.
            </p>
          </header>
          {loading || authLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <StatisticsDashboard
              initialCrews={crews}
              initialEmployees={employees}
              initialDailyLabor={dailyLabor}
              initialProjects={projects}
              initialAbsenceTypes={absenceTypes}
              initialSpecialHourTypes={specialHourTypes}
              initialUnproductiveHourTypes={unproductiveHourTypes}
            />
          )}
        </div>
      </main>
    </>
  );
}
