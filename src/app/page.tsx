import AttendanceTracker from "@/components/attendance-tracker";
import { Toaster } from "@/components/ui/toaster";

export default function Home() {
  return (
    <>
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-primary font-headline">
              Attendance Tracker
            </h1>
            <p className="text-muted-foreground mt-2">
              Plataforma para el seguimiento de asistencias de cuadrillas.
            </p>
          </header>
          <AttendanceTracker />
        </div>
      </main>
      <Toaster />
    </>
  );
}
