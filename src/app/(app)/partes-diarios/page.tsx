
'use client';

import { useState, useEffect } from 'react';
import DailyLaborReport from "@/components/daily-labor-report";
import { getCrews, getEmployees, getDailyLabor, getObras, getDailyLaborNotifications, getAbsenceTypes, getPhases, getSpecialHourTypes, getUnproductiveHourTypes, getPermissions } from "@/app/actions";
import type { Crew, Employee, DailyLaborData, Obra, DailyLaborNotificationData, AbsenceType, Phase, SpecialHourType, UnproductiveHourType, Permission } from '@/types';
import { Loader2 } from 'lucide-react';

export default function PartesDiariosPage() {
  const [initialCrews, setInitialCrews] = useState<Crew[]>([]);
  const [initialEmployees, setInitialEmployees] = useState<Employee[]>([]);
  const [initialLaborData, setInitialLaborData] = useState<DailyLaborData>({});
  const [initialObras, setInitialObras] = useState<Obra[]>([]);
  const [initialNotificationData, setInitialNotificationData] = useState<DailyLaborNotificationData>({});
  const [initialAbsenceTypes, setInitialAbsenceTypes] = useState<AbsenceType[]>([]);
  const [initialPhases, setInitialPhases] = useState<Phase[]>([]);
  const [initialSpecialHourTypes, setInitialSpecialHourTypes] = useState<SpecialHourType[]>([]);
  const [initialUnproductiveHourTypes, setInitialUnproductiveHourTypes] = useState<UnproductiveHourType[]>([]);
  const [initialPermissions, setInitialPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [
          crewsData,
          employeesData,
          laborData,
          obrasData,
          notificationData,
          absenceTypesData,
          phasesData,
          specialHourTypesData,
          unproductiveHourTypesData,
          permissionsData
        ] = await Promise.all([
          getCrews(),
          getEmployees(),
          getDailyLabor(),
          getObras(),
          getDailyLaborNotifications(),
          getAbsenceTypes(),
          getPhases(),
          getSpecialHourTypes(),
          getUnproductiveHourTypes(),
          getPermissions()
        ]);
        setInitialCrews(crewsData);
        setInitialEmployees(employeesData);
        setInitialLaborData(laborData);
        setInitialObras(obrasData);
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
    fetchData();
  }, []);

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
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <DailyLaborReport
              initialCrews={initialCrews}
              initialEmployees={initialEmployees}
              initialLaborData={initialLaborData}
              initialObras={initialObras}
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
