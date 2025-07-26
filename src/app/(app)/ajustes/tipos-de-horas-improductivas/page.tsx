
'use client';

import { useState, useEffect } from 'react';
import UnproductiveHourTypesManager from "@/components/unproductive-hour-types-manager";
import { Loader2 } from "lucide-react";
import type { UnproductiveHourType } from '@/types';
import { useAuth } from '@/context/auth-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TiposDeHorasImproductivasPage() {
  const { user, loading: authLoading } = useAuth();
  const [initialUnproductiveHourTypes, setInitialUnproductiveHourTypes] = useState<UnproductiveHourType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const unproductiveHourTypesSnapshot = await getDocs(collection(db, 'unproductive-hour-types'));
        setInitialUnproductiveHourTypes(unproductiveHourTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UnproductiveHourType[]);
      } catch (error) {
        console.error("Failed to fetch unproductive hour types data:", error);
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
        <UnproductiveHourTypesManager initialUnproductiveHourTypes={initialUnproductiveHourTypes} />
      )}
    </>
  );
}
