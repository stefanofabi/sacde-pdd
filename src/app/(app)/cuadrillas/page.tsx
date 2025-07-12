
import CrewsManager from "@/components/crews-manager";
import { getCrews, getObras, getEmployees, getPhases } from "@/app/actions";

export default async function CuadrillasPage() {
  const initialCrews = await getCrews();
  const initialObras = await getObras();
  const initialEmployees = await getEmployees();
  const initialPhases = await getPhases();

  return (
    <>
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-primary font-headline">
              Gestión de Cuadrillas
            </h1>
            <p className="text-muted-foreground mt-2">
              Añada, vea y gestione las cuadrillas de Sacde.
            </p>
          </header>
          <CrewsManager 
            initialCrews={initialCrews} 
            initialObras={initialObras}
            initialEmployees={initialEmployees} 
            initialPhases={initialPhases}
          />
        </div>
      </main>
    </>
  );
}
