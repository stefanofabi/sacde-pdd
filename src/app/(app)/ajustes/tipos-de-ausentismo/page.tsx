
'use client';

import { useState, useEffect } from 'react';
import AbsenceTypesManager from "@/components/absence-types-manager";
import { Loader2 } from "lucide-react";
import type { AbsenceType } from '@/types';
import { useAuth } from '@/context/auth-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TiposDeAusentismoPage() {
  const { user, loading: authLoading } = useAuth();
  const [initialAbsenceTypes, setInitialAbsenceTypes] = useState<AbsenceType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const absenceTypesSnapshot = await getDocs(collection(db, 'absence-types'));
        setInitialAbsenceTypes(absenceTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AbsenceType[]);
      } catch (error) {
        console.error("Failed to fetch absence types data:", error);
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
      {loading || authLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <AbsenceTypesManager initialAbsenceTypes={initialAbsenceTypes} />
      )}
    </>
  );
}
