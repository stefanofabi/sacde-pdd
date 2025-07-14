
'use client';

import { useState, useEffect } from 'react';
import ObrasManager from "@/components/obras-manager";
import { getObras } from "@/app/actions";
import type { Obra } from '@/types';
import { Loader2 } from 'lucide-react';

export default function ObrasPage() {
  const [initialObras, setInitialObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const obrasData = await getObras();
        setInitialObras(obrasData);
      } catch (error) {
        console.error("Failed to fetch obras data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ObrasManager initialObras={initialObras} />
          )}
        </div>
      </main>
    </>
  );
}
