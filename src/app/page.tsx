
import AttendanceTracker from "@/components/attendance-tracker";
import { Toaster } from "@/components/ui/toaster";
import { getCrews, getAttendance } from "@/app/actions";

export default async function Home() {
  const initialCrews = await getCrews();
  const initialAttendance = await getAttendance();

  return (
    <>
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-primary font-headline">
              Parte Digital
            </h1>
            <p className="text-muted-foreground mt-2">
              Plataforma para el seguimiento de asistencias de cuadrillas de Sacde.
            </p>
          </header>
          <AttendanceTracker 
            initialCrews={initialCrews}
            initialAttendance={initialAttendance}
          />
        </div>
      </main>
      <Toaster />
    </>
  );
}
