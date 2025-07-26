
'use client';

import { useState, useEffect } from 'react';
import PhasesManager from "@/components/phases-manager";
import { Loader2 } from "lucide-react";
import type { Phase } from '@/types';
import { useAuth } from '@/context/auth-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function FasesPage() {
  const { user, loading: authLoading } = useAuth();
  const [initialPhases, setInitialPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const phasesSnapshot = await getDocs(collection(db, 'phases'));
        setInitialPhases(phasesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Phase[]);
      } catch (error) {
        console.error("Failed to fetch phases data:", error);
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
        <PhasesManager initialPhases={initialPhases} />
      )}
    </>
  );
}
