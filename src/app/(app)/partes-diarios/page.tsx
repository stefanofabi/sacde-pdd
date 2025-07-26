
'use client';

import { Suspense, useState, useEffect } from 'react';
import DailyLaborReport from "@/components/daily-labor-report";
import type { Crew, Employee, DailyLaborData, Project, DailyLaborNotificationData, AbsenceType, Phase, SpecialHourType, UnproductiveHourType, Permission, LegacyDailyLaborEntry, DailyLaborEntry } from '@/types';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';

function PartesDiariosContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
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
  const router = useRouter();

  // State for query params
  const [preselectedDate, setPreselectedDate] = useState<string | null>(null);
  const [preselectedProject, setPreselectedProject] = useState<string | null>(null);
  const [preselectedCrew, setPreselectedCrew] = useState<string | null>(null);
  
  useEffect(() => {
    setPreselectedDate(searchParams.get('date'));
    setPreselectedProject(searchParams.get('project'));
    setPreselectedCrew(searchParams.get('crew'));
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && user) {
        if (!user.is_superuser && !user.role?.permissions.includes('dailyReports')) {
            router.replace('/dashboard');
            return;
        }
        fetchData();
    } else if (!authLoading && !user) {
        router.replace('/login');
    }

    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const [
          crewsSnapshot,
          employeesSnapshot,
          laborSnapshot,
          projectsSnapshot,
          notificationSnapshot,
          absenceTypesSnapshot,
          phasesSnapshot,
          specialHourTypesSnapshot,
          unproductiveHourTypesSnapshot,
          permissionsSnapshot
        ] = await Promise.all([
          getDocs(collection(db, 'crews')),
          getDocs(collection(db, 'employees')),
          getDocs(collection(db, 'daily-labor')),
          getDocs(collection(db, 'projects')),
          getDocs(collection(db, 'daily-labor-notifications')),
          getDocs(collection(db, 'absence-types')),
          getDocs(collection(db, 'phases')),
          getDocs(collection(db, 'special-hour-types')),
          getDocs(collection(db, 'unproductive-hour-types')),
          getDocs(collection(db, 'permissions')),
        ]);

        const crewsData = crewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Crew[];
        const employeesData = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
        const projectsData = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];
        const absenceTypesData = absenceTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AbsenceType[];
        const phasesData = phasesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Phase[];
        const specialHourTypesData = specialHourTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SpecialHourType[];
        const unproductiveHourTypesData = unproductiveHourTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UnproductiveHourType[];
        const permissionsData = permissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Permission[];

        const laborData: DailyLaborData = {};
        laborSnapshot.docs.forEach(doc => {
            const entry = { id: doc.id, ...doc.data() } as { date: string } & (DailyLaborEntry | LegacyDailyLaborEntry);
            const { date, ...rest } = entry;
            if (!laborData[date]) {
                laborData[date] = [];
            }
            laborData[date].push(rest);
        });
        
        const notificationsData: DailyLaborNotificationData = {};
        notificationSnapshot.docs.forEach(doc => {
            const entry = doc.data() as { date: string; crewId: string; notified: boolean; notifiedAt: string };
            const { date, crewId, notified, notifiedAt } = entry;
            if (!notificationsData[date]) {
                notificationsData[date] = {};
            }
            notificationsData[date][crewId] = { notified, notifiedAt };
        });

        setInitialCrews(crewsData);
        setInitialEmployees(employeesData);
        setInitialLaborData(laborData);
        setInitialProjects(projectsData);
        setInitialNotificationData(notificationsData);
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
  }, [user, authLoading, router]);

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
              preselectedDate={preselectedDate}
              preselectedProject={preselectedProject}
              preselectedCrew={preselectedCrew}
            />
          )}
        </div>
      </main>
    </>
  );
}

export default function PartesDiariosPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <PartesDiariosContent />
    </Suspense>
  )
}

    