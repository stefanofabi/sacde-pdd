
import PermissionsManager from "@/components/permissions-manager";
import { Toaster } from "@/components/ui/toaster";
import { getPermissions, getEmployees, getAbsenceTypes } from "@/app/actions";
import { getTranslations } from "next-intl/server";

export default async function PermisosPage() {
  const initialPermissions = await getPermissions();
  const initialEmployees = await getEmployees();
  const initialAbsenceTypes = await getAbsenceTypes();
  const t = await getTranslations('PermisosPage');

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
          <PermissionsManager 
            initialPermissions={initialPermissions}
            initialEmployees={initialEmployees}
            initialAbsenceTypes={initialAbsenceTypes}
          />
        </div>
      </main>
      <Toaster />
    </>
  );
}
