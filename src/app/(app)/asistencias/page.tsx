
'use client';

import { useState, useEffect } from 'react';
import AttendanceTracker from "@/components/attendance-tracker";
import { getAttendance } from "@/app/actions";
import type { Crew, AttendanceData, Project, Employee } from '@/types';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AsistenciasPage() {
  const { user, loading: authLoading } = useAuth();
  const [initialCrews, setInitialCrews] = useState<Crew[]>([]);
  const [initialAttendance, setInitialAttendance] = useState<AttendanceData>({});
  const [initialProjects, setInitialProjects] = useState<Project[]>([]);
  const [initialEmployees, setInitialEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const [
          attendanceSnapshot,
          crewsSnapshot,
          projectsSnapshot,
          employeesSnapshot
        ] = await Promise.all([
          getDocs(collection(db, 'attendance')),
          getDocs(collection(db, 'crews')),
          getDocs(collection(db, 'projects')),
          getDocs(collection(db, 'employees')),
        ]);

        const attendanceData: AttendanceData = {};
        attendanceSnapshot.forEach(docSnap => {
          const entry = { id: docSnap.id, ...docSnap.data() };
          const { date, ...rest } = entry;
          if (!attendanceData[date]) {
              attendanceData[date] = [];
          }
          // @ts-ignore
          attendanceData[date].push(rest);
        });

        const crewsData = crewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Crew[];
        const projectsData = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];
        const employeesData = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];

        setInitialCrews(crewsData);
        setInitialAttendance(attendanceData);
        setInitialProjects(projectsData);
        setInitialEmployees(employeesData);
      } catch (error) {
        console.error("Failed to fetch attendance data:", error);
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
              Parte Digital - Asistencias
            </h1>
            <p className="text-muted-foreground mt-2">
              Plataforma para el seguimiento de asistencias de cuadrillas de Sacde.
            </p>
          </header>
          {loading || authLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <AttendanceTracker
              initialCrews={initialCrews}
              initialAttendance={initialAttendance}
              initialProjects={initialProjects}
              initialEmployees={initialEmployees}
            />
          )}
        </div>
      </main>
    </>
  );
}
