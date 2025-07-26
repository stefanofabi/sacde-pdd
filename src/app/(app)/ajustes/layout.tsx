
'use client';

import { Settings, Loader2 } from "lucide-react";
import SettingsNavigation from "./settings-navigation";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import React from "react";
import type { PermissionKey } from "@/types";

const settingsPermissions: PermissionKey[] = [
  'settings.projects',
  'settings.absenceTypes',
  'settings.phases',
  'settings.specialHourTypes',
  'settings.unproductiveHourTypes',
  'settings.roles',
];

export default function AjustesLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && user) {
      const userPermissions = user.role?.permissions || [];
      const canAccessSettings = user.is_superuser || settingsPermissions.some(p => userPermissions.includes(p));
      
      if (!canAccessSettings) {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router]);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

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
