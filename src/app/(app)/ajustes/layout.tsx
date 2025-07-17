
'use client';

import { Settings } from "lucide-react";
import SettingsNavigation from "./settings-navigation";


export default function AjustesLayout({ children }: { children: React.ReactNode }) {

  return (
    <>
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-primary font-headline flex items-center gap-3">
              <Settings className="h-10 w-10" />
              Ajustes
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure las opciones de la aplicación.
            </p>
          </header>
          
          <div className="space-y-8">
            <SettingsNavigation />
            {children}
          </div>

        </div>
      </main>
    </>
  );
}
