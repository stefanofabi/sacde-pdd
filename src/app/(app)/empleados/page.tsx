import EmployeesManager from "@/components/employees-manager";
import { Toaster } from "@/components/ui/toaster";
import { getEmployees, getObras } from "@/app/actions";

export default async function EmpleadosPage() {
  const initialEmployees = await getEmployees();
  const initialObras = await getObras();

  return (
    <>
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-primary font-headline">
              Gestión de Empleados
            </h1>
            <p className="text-muted-foreground mt-2">
              Añada, vea y gestione los empleados de Sacde.
            </p>
          </header>
          <EmployeesManager initialEmployees={initialEmployees} initialObras={initialObras} />
        </div>
      </main>
      <Toaster />
    </>
  );
}
