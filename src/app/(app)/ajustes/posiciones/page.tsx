
'use client';

import { useState, useEffect } from 'react';
import PositionsManager from "@/components/positions-manager";
import { Loader2 } from "lucide-react";
import type { EmployeePosition } from '@/types';
import { useAuth } from '@/context/auth-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function PosicionesPage() {
  const { user, loading: authLoading } = useAuth();
  const [initialPositions, setInitialPositions] = useState<EmployeePosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const positionsSnapshot = await getDocs(collection(db, 'employee-positions'));
        setInitialPositions(positionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EmployeePosition[]);
      } catch (error) {
        console.error("Failed to fetch positions data:", error);
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
        <PositionsManager initialPositions={initialPositions} />
      )}
    </>
  );
}
