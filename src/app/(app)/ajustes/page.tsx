
'use client';

import { useState, useEffect } from 'react';
import AbsenceTypesManager from "@/components/absence-types-manager";
import PhasesManager from "@/components/phases-manager";
import SpecialHourTypesManager from "@/components/special-hour-types-manager";
import UnproductiveHourTypesManager from "@/components/unproductive-hour-types-manager";
import { Settings, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { AbsenceType, Phase, SpecialHourType, UnproductiveHourType } from '@/types';
import { useAuth } from '@/context/auth-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AjustesPage() {
  const { user, loading: authLoading } = useAuth();
  const [initialAbsenceTypes, setInitialAbsenceTypes] = useState<AbsenceType[]>([]);
  const [initialPhases, setInitialPhases] = useState<Phase[]>([]);
  const [initialSpecialHourTypes, setInitialSpecialHourTypes] = useState<SpecialHourType[]>([]);
  const [initialUnproductiveHourTypes, setInitialUnproductiveHourTypes] = useState<UnproductiveHourType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const [
          absenceTypesSnapshot,
          phasesSnapshot,
          specialHourTypesSnapshot,
          unproductiveHourTypesSnapshot,
        ] = await Promise.all([
          getDocs(collection(db, 'absence-types')),
          getDocs(collection(db, 'phases')),
          getDocs(collection(db, 'special-hour-types')),
          getDocs(collection(db, 'unproductive-hour-types')),
        ]);
        
        setInitialAbsenceTypes(absenceTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AbsenceType[]);
        setInitialPhases(phasesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Phase[]);
        setInitialSpecialHourTypes(specialHourTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SpecialHourType[]);
        setInitialUnproductiveHourTypes(unproductiveHourTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UnproductiveHourType[]);

      } catch (error) {
        console.error("Failed to fetch settings data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (user && !authLoading) {
      fetchData();
    }
  }, [user, authLoading]);

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
          {loading || authLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-8">
              <AbsenceTypesManager initialAbsenceTypes={initialAbsenceTypes} />
              <Separator />
              <PhasesManager initialPhases={initialPhases} />
              <Separator />
              <SpecialHourTypesManager initialSpecialHourTypes={initialSpecialHourTypes} />
              <Separator />
              <UnproductiveHourTypesManager initialUnproductiveHourTypes={initialUnproductiveHourTypes} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
