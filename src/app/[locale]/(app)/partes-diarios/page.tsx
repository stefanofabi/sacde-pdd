
import DailyLaborReport from "@/components/daily-labor-report";
import { Toaster } from "@/components/ui/toaster";
import { getCrews, getEmployees, getDailyLabor, getObras, getDailyLaborNotifications, getAbsenceTypes, getPhases, getSpecialHourTypes, getUnproductiveHourTypes, getPermissions } from "@/app/actions";
import { getTranslations } from "next-intl/server";

export default async function PartesDiariosPage() {
  const [
    initialCrews,
    initialEmployees,
    initialLaborData,
    initialObras,
    initialNotificationData,
    initialAbsenceTypes,
    initialPhases,
    initialSpecialHourTypes,
    initialUnproductiveHourTypes,
    initialPermissions
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

  const t = await getTranslations('PartesDiariosPage');

  return (
    <>
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-primary font-headline">
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('description')}
            </p>
          </header>
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
        </div>
      </main>
      <Toaster />
    </>
  );
}
