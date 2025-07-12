
import AbsenceTypesManager from "@/components/absence-types-manager";
import PhasesManager from "@/components/phases-manager";
import SpecialHourTypesManager from "@/components/special-hour-types-manager";
import UnproductiveHourTypesManager from "@/components/unproductive-hour-types-manager";
import { getAbsenceTypes, getPhases, getSpecialHourTypes, getUnproductiveHourTypes } from "@/app/actions";
import { Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default async function AjustesPage() {
  const initialAbsenceTypes = await getAbsenceTypes();
  const initialPhases = await getPhases();
  const initialSpecialHourTypes = await getSpecialHourTypes();
  const initialUnproductiveHourTypes = await getUnproductiveHourTypes();

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
            <AbsenceTypesManager initialAbsenceTypes={initialAbsenceTypes} />
            <Separator />
            <PhasesManager initialPhases={initialPhases} />
            <Separator />
            <SpecialHourTypesManager initialSpecialHourTypes={initialSpecialHourTypes} />
            <Separator />
            <UnproductiveHourTypesManager initialUnproductiveHourTypes={initialUnproductiveHourTypes} />
          </div>
        </div>
      </main>
    </>
  );
}
