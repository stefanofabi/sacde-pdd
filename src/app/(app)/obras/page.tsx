import ObrasManager from "@/components/obras-manager";
import { Toaster } from "@/components/ui/toaster";
import { getObras } from "@/app/actions";

export default async function ObrasPage() {
  const initialObras = await getObras();

  return (
    <>
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-primary font-headline">
              Gestión de Obras
            </h1>
            <p className="text-muted-foreground mt-2">
              Añada, vea y gestione las obras de Sacde.
            </p>
          </header>
          <ObrasManager initialObras={initialObras} />
        </div>
      </main>
      <Toaster />
    </>
  );
}
