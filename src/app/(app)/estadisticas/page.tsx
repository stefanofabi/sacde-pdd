
'use client';

import { useState, useEffect } from 'react';
import StatisticsDashboard from "@/components/statistics-dashboard";
import { getCrews, getEmployees, getDailyLabor, getObras, getAbsenceTypes, getSpecialHourTypes, getUnproductiveHourTypes } from "@/app/actions";
import { BarChart3, Loader2 } from "lucide-react";
import type { Crew, Employee, DailyLaborData, Obra, AbsenceType, SpecialHourType, UnproductiveHourType } from '@/types';

export default function EstadisticasPage() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dailyLabor, setDailyLabor] = useState<DailyLaborData>({});
  const [obras, setObras] = useState<Obra[]>([]);
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceType[]>([]);
  const [specialHourTypes, setSpecialHourTypes] = useState<SpecialHourType[]>([]);
  const [unproductiveHourTypes, setUnproductiveHourTypes] = useState<UnproductiveHourType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [
          crewsData,
          employeesData,
          dailyLaborData,
          obrasData,
          absenceTypesData,
          specialHourTypesData,
          unproductiveHourTypesData
        ] = await Promise.all([
          getCrews(),
          getEmployees(),
          getDailyLabor(),
          getObras(),
          getAbsenceTypes(),
          getSpecialHourTypes(),
          getUnproductiveHourTypes()
        ]);
        setCrews(crewsData);
        setEmployees(employeesData);
        setDailyLabor(dailyLaborData);
        setObras(obrasData);
        setAbsenceTypes(absenceTypesData);
        setSpecialHourTypes(specialHourTypesData);
        setUnproductiveHourTypes(unproductiveHourTypesData);
      } catch (error) {
        console.error("Failed to fetch statistics data:", error);
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
            <h1 className="text-4xl font-bold text-primary font-headline flex items-center gap-3">
              <BarChart3 className="h-10 w-10" />
              Estadísticas
            </h1>
            <p className="text-muted-foreground mt-2">
              Analice los datos de asistencia y productividad con filtros y gráficos.
            </p>
          </header>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <StatisticsDashboard
              initialCrews={crews}
              initialEmployees={employees}
              initialDailyLabor={dailyLabor}
              initialObras={obras}
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
