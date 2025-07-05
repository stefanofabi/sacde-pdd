
import StatisticsDashboard from "@/components/statistics-dashboard";
import { Toaster } from "@/components/ui/toaster";
import { getCrews, getEmployees, getDailyLabor, getObras, getAbsenceTypes, getSpecialHourTypes, getUnproductiveHourTypes } from "@/app/actions";
import { getTranslations } from "next-intl/server";
import { BarChart3 } from "lucide-react";

export default async function EstadisticasPage() {
  const t = await getTranslations('EstadisticasPage');
  
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
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('description')}
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
      <Toaster />
    </>
  );
}
