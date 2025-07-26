
'use client';

import { useState, useEffect } from 'react';
import RolesManager from "@/components/roles-manager";
import { Loader2 } from "lucide-react";
import type { Role } from '@/types';
import { useAuth } from '@/context/auth-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function RolesPage() {
  const { user, loading: authLoading } = useAuth();
  const [initialRoles, setInitialRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const rolesSnapshot = await getDocs(collection(db, 'roles'));
        setInitialRoles(rolesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Role[]);
      } catch (error) {
        console.error("Failed to fetch roles data:", error);
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
        <RolesManager initialRoles={initialRoles} />
      )}
    </>
  );
}
