
'use client';

import { useState, useEffect } from 'react';
import UsersManager from "@/components/users-manager";
import { getUsers } from "@/app/actions";
import type { User } from '@/types';
import { UserCog, Loader2 } from "lucide-react";

export default function UsuariosPage() {
  const [initialUsers, setInitialUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const users = await getUsers();
        setInitialUsers(users);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        // Optionally, show a toast or error message to the user
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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
          {loading ? (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <UsersManager initialUsers={initialUsers} />
          )}
        </div>
      </main>
    </>
  );
}
