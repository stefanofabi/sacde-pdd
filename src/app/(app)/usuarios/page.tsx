
'use client';

import { useState, useEffect } from 'react';
import UsersManager from "@/components/users-manager";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Role } from '@/types';
import { UserCog, Loader2 } from "lucide-react";
import { useAuth } from '@/context/auth-context';

export default function UsuariosPage() {
  const { user, loading: authLoading } = useAuth();
  const [initialUsers, setInitialUsers] = useState<User[]>([]);
  const [initialRoles, setInitialRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const [usersSnapshot, rolesSnapshot] = await Promise.all([
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'roles'))
        ]);
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
        const rolesData = rolesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Role[];
        setInitialUsers(usersData);
        setInitialRoles(rolesData);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
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
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-primary font-headline flex items-center gap-3">
              <UserCog className="h-10 w-10" />
              Gestión de Usuarios
            </h1>
            <p className="text-muted-foreground mt-2">
              Modifique los roles y datos de los usuarios del sistema.
            </p>
          </header>
          {loading || authLoading ? (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <UsersManager initialUsers={initialUsers} initialRoles={initialRoles} />
          )}
        </div>
      </main>
    </>
  );
}
