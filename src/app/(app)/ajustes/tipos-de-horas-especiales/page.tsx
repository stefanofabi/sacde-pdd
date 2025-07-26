
'use client';

import { useState, useEffect } from 'react';
import SpecialHourTypesManager from "@/components/special-hour-types-manager";
import { Loader2 } from "lucide-react";
import type { SpecialHourType } from '@/types';
import { useAuth } from '@/context/auth-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TiposDeHorasEspecialesPage() {
  const { user, loading: authLoading } = useAuth();
  const [initialSpecialHourTypes, setInitialSpecialHourTypes] = useState<SpecialHourType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const specialHourTypesSnapshot = await getDocs(collection(db, 'special-hour-types'));
        setInitialSpecialHourTypes(specialHourTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SpecialHourType[]);
      } catch (error) {
        console.error("Failed to fetch special hour types data:", error);
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
        <SpecialHourTypesManager initialSpecialHourTypes={initialSpecialHourTypes} />
      )}
    </>
  );
}
