
import DailyLaborReport from "@/components/daily-labor-report";
import { Toaster } from "@/components/ui/toaster";
import { getCrews, getEmployees, getDailyLabor, getObras } from "@/app/actions";

export default async function PartesDiariosPage() {
  const initialCrews = await getCrews();
  const initialEmployees = await getEmployees();
  const initialLaborData = await getDailyLabor();
  const initialObras = await getObras();

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
          <DailyLaborReport
            initialCrews={initialCrews}
            initialEmployees={initialEmployees}
            initialLaborData={initialLaborData}
            initialObras={initialObras}
          />
        </div>
      </main>
      <Toaster />
    </>
  );
}
