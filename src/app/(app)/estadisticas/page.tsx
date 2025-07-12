
import StatisticsDashboard from "@/components/statistics-dashboard";
import { getCrews, getEmployees, getDailyLabor, getObras, getAbsenceTypes, getSpecialHourTypes, getUnproductiveHourTypes } from "@/app/actions";
import { BarChart3 } from "lucide-react";

export default async function EstadisticasPage() {
  
  // Fetch all data required for the dashboard
  const [
    crews,
    employees,
    dailyLabor,
    obras,
    absenceTypes,
    specialHourTypes,
    unproductiveHourTypes
  ] = await Promise.all([
    getCrews(),
    getEmployees(),
    getDailyLabor(),
    getObras(),
    getAbsenceTypes(),
    getSpecialHourTypes(),
    getUnproductiveHourTypes()
  ]);

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
          <StatisticsDashboard
            initialCrews={crews}
            initialEmployees={employees}
            initialDailyLabor={dailyLabor}
            initialObras={obras}
            initialAbsenceTypes={absenceTypes}
            initialSpecialHourTypes={specialHourTypes}
            initialUnproductiveHourTypes={unproductiveHourTypes}
          />
        </div>
      </main>
    </>
  );
}
