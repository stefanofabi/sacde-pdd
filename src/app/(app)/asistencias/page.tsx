
'use client';

import { useState, useEffect } from 'react';
import AttendanceTracker from "@/components/attendance-tracker";
import { getCrews, getAttendance, getObras, getEmployees } from "@/app/actions";
import type { Crew, AttendanceData, Obra, Employee } from '@/types';
import { Loader2 } from 'lucide-react';

export default function AsistenciasPage() {
  const [initialCrews, setInitialCrews] = useState<Crew[]>([]);
  const [initialAttendance, setInitialAttendance] = useState<AttendanceData>({});
  const [initialObras, setInitialObras] = useState<Obra[]>([]);
  const [initialEmployees, setInitialEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [crewsData, attendanceData, obrasData, employeesData] = await Promise.all([
          getCrews(),
          getAttendance(),
          getObras(),
          getEmployees(),
        ]);
        setInitialCrews(crewsData);
        setInitialAttendance(attendanceData);
        setInitialObras(obrasData);
        setInitialEmployees(employeesData);
      } catch (error) {
        console.error("Failed to fetch attendance data:", error);
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
              Parte Digital - Asistencias
            </h1>
            <p className="text-muted-foreground mt-2">
              Plataforma para el seguimiento de asistencias de cuadrillas de Sacde.
            </p>
          </header>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <AttendanceTracker
              initialCrews={initialCrews}
              initialAttendance={initialAttendance}
              initialObras={initialObras}
              initialEmployees={initialEmployees}
            />
          )}
        </div>
      </main>
    </>
  );
}
