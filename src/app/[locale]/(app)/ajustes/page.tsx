
import AbsenceTypesManager from "@/components/absence-types-manager";
import { Toaster } from "@/components/ui/toaster";
import { getAbsenceTypes } from "@/app/actions";
import { getTranslations } from "next-intl/server";
import { Settings } from "lucide-react";

export default async function AjustesPage() {
  const initialAbsenceTypes = await getAbsenceTypes();
  const t = await getTranslations('AjustesPage');

  return (
    <>
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-primary font-headline flex items-center gap-3">
              <Settings className="h-10 w-10" />
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('description')}
            </p>
          </header>
          <AbsenceTypesManager initialAbsenceTypes={initialAbsenceTypes} />
        </div>
      </main>
      <Toaster />
    </>
  );
}
