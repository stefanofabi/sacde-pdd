
import CrewsManager from "@/components/crews-manager";
import { Toaster } from "@/components/ui/toaster";
import { getCrews, getObras, getEmployees } from "@/app/actions";
import { getTranslations } from "next-intl/server";

export default async function CuadrillasPage() {
  const initialCrews = await getCrews();
  const initialObras = await getObras();
  const initialEmployees = await getEmployees();
  const t = await getTranslations('CuadrillasPage');

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
          <CrewsManager 
            initialCrews={initialCrews} 
            initialObras={initialObras}
            initialEmployees={initialEmployees} 
          />
        </div>
      </main>
      <Toaster />
    </>
  );
}
