
'use client';

import { useState, useEffect } from 'react';
import DailyLaborReport from "@/components/daily-labor-report";
import { getDailyLabor, getProjects, getDailyLaborNotifications, getAbsenceTypes, getPhases, getSpecialHourTypes, getUnproductiveHourTypes, getPermissions } from "@/app/actions";
import type { Crew, Employee, DailyLaborData, Project, DailyLaborNotificationData, AbsenceType, Phase, SpecialHourType, UnproductiveHourType, Permission } from '@/types';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function PartesDiariosPage() {
  const { user, loading: authLoading } = useAuth();
  const [initialCrews, setInitialCrews] = useState<Crew[]>([]);
  const [initialEmployees, setInitialEmployees] = useState<Employee[]>([]);
  const [initialLaborData, setInitialLaborData] = useState<DailyLaborData>({});
  const [initialProjects, setInitialProjects] = useState<Project[]>([]);
  const [initialNotificationData, setInitialNotificationData] = useState<DailyLaborNotificationData>({});
  const [initialAbsenceTypes, setInitialAbsenceTypes] = useState<AbsenceType[]>([]);
  const [initialPhases, setInitialPhases] = useState<Phase[]>([]);
  const [initialSpecialHourTypes, setInitialSpecialHourTypes] = useState<SpecialHourType[]>([]);
  const [initialUnproductiveHourTypes, setInitialUnproductiveHourTypes] = useState<UnproductiveHourType[]>([]);
  const [initialPermissions, setInitialPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const [
          crewsSnapshot,
          employeesSnapshot,
          laborData,
          projectsData,
          notificationData,
          absenceTypesData,
          phasesData,
          specialHourTypesData,
          unproductiveHourTypesData,
          permissionsData
        ] = await Promise.all([
          getDocs(collection(db, 'crews')),
          getDocs(collection(db, 'employees')),
          getDailyLabor(),
          getProjects(),
          getDailyLaborNotifications(),
          getAbsenceTypes(),
          getPhases(),
          getSpecialHourTypes(),
          getUnproductiveHourTypes(),
          getPermissions()
        ]);

        const crewsData = crewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Crew[];
        const employeesData = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];

        setInitialCrews(crewsData);
        setInitialEmployees(employeesData);
        setInitialLaborData(laborData);
        setInitialProjects(projectsData);
        setInitialNotificationData(notificationData);
        setInitialAbsenceTypes(absenceTypesData);
        setInitialPhases(phasesData);
        setInitialSpecialHourTypes(specialHourTypesData);
        setInitialUnproductiveHourTypes(unproductiveHourTypesData);
        setInitialPermissions(permissionsData);
      } catch (error) {
        console.error("Failed to fetch daily labor data:", error);
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
              Partes Diarios - Mano de Obra
            </h1>
            <p className="text-muted-foreground mt-2">
              Registre las horas trabajadas por el personal de cada cuadrilla.
            </p>
          </header>
          {loading || authLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <DailyLaborReport
              initialCrews={initialCrews}
              initialEmployees={initialEmployees}
              initialLaborData={initialLaborData}
              initialProjects={initialProjects}
              initialNotificationData={initialNotificationData}
              initialAbsenceTypes={initialAbsenceTypes}
              initialPhases={initialPhases}
              initialSpecialHourTypes={initialSpecialHourTypes}
              initialUnproductiveHourTypes={initialUnproductiveHourTypes}
              initialPermissions={initialPermissions}
            />
          )}
        </div>
      </main>
    </>
  );
}
