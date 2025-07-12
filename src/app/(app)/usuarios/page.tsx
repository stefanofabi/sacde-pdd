
import UsersManager from "@/components/users-manager";
import { getEmployees, getUsers } from "@/app/actions";
import { UserCog } from "lucide-react";

export default async function UsuariosPage() {
  const initialUsers = await getUsers();
  const initialEmployees = await getEmployees();

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
          <UsersManager initialUsers={initialUsers} initialEmployees={initialEmployees} />
        </div>
      </main>
    </>
  );
}
