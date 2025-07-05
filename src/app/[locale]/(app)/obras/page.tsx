
import ObrasManager from "@/components/obras-manager";
import { Toaster } from "@/components/ui/toaster";
import { getObras } from "@/app/actions";
import { getTranslations } from "next-intl/server";

export default async function ObrasPage() {
  const initialObras = await getObras();
  const t = await getTranslations('ObrasPage');

  return (
    <>
      <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-primary font-headline">
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('description')}
            </p>
          </header>
          <ObrasManager initialObras={initialObras} />
        </div>
      </main>
      <Toaster />
    </>
  );
}
