
"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Pencil, PlusCircle } from "lucide-react";
import type { EmployeeRole, User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { updateUser, addUser } from "@/app/actions";

interface UsersManagerProps {
  initialUsers: User[];
}

const emptyAddForm = {
    email: "",
    role: "invitado" as EmployeeRole,
};

export default function UsersManager({ initialUsers }: UsersManagerProps) {
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editFormState, setEditFormState] = useState<Partial<User>>({});
  const [addFormState, setAddFormState] = useState(emptyAddForm);
  const [isPending, startTransition] = useTransition();
  
  const filteredUsers = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
    if (!lowerCaseSearchTerm) {
      return users;
    }
    return users.filter((user) => {
      const email = user.email.toLowerCase();
      return email.includes(lowerCaseSearchTerm);
    });
  }, [users, searchTerm]);

  const handleOpenEditDialog = (user: User) => {
    setEditingUser(user);
    setEditFormState({
      email: user.email,
      role: user.role,
    });
    setIsEditDialogOpen(true);
  };
  
  const handleOpenAddDialog = () => {
    setAddFormState(emptyAddForm);
    setIsAddDialogOpen(true);
  }

  const handleSaveUser = () => {
    if (!editingUser || !editFormState.email || !editFormState.role) return;

    startTransition(async () => {
      try {
        const updatedUser = await updateUser(editingUser.id, { 
          email: editFormState.email, 
          role: editFormState.role,
        });
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        
        toast({
          title: "Usuario Actualizado",
          description: `El usuario "${updatedUser.email}" ha sido actualizado.`,
        });
        
        setIsEditDialogOpen(false);
        setEditingUser(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
        toast({
          title: "Error al Actualizar",
          description: errorMessage,
          variant: "destructive",
        });
      }
    });
  };
  
  const handleAddUser = () => {
    const { email, role } = addFormState;
    if (!email || !role) {
      toast({
        title: "Error de validación",
        description: "Debe completar el email y el rol.",
        variant: "destructive",
      });
      return;
    }
    
    startTransition(async () => {
      try {
        const newUser = await addUser(addFormState);
        setUsers((prev) => [...prev, newUser]);
        toast({
          title: "Usuario Creado",
          description: `El usuario "${newUser.email}" ha sido creado.`,
        });
        setIsAddDialogOpen(false);
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
        toast({
          title: "Error al Crear Usuario",
          description: errorMessage,
          variant: "destructive",
        });
      }
    });
  };

  const roleOptions: { value: EmployeeRole; label: string }[] = [
    { value: 'admin', label: "Administrador" },
    { value: 'crew_manager', label: "Administrador de Cuadrillas" },
    { value: 'foreman', label: "Capataz" },
    { value: 'tallyman', label: "Apuntador" },
    { value: 'project_manager', label: "Jefe de Obra" },
    { value: 'management_control', label: "Control y Gestión" },
    { value: 'recursos_humanos', label: "Recursos Humanos" },
    { value: 'invitado', label: "Invitado" },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Lista de Usuarios</CardTitle>
              <CardDescription>Busque usuarios y gestione sus roles y permisos.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-[250px]"
                />
                </div>
                 <Button onClick={handleOpenAddDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar Usuario
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                            <Badge variant="secondary">{roleOptions.find(r => r.value === user.role)?.label || user.role}</Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                            <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditDialog(user)}
                            disabled={isPending}
                            >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar {user.email}</span>
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      {users.length === 0 ? "No hay usuarios." : "No se encontraron usuarios con el filtro aplicado."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditingUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Modifique el rol y el email del usuario.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="email-edit">Email</Label>
                <Input 
                    id="email-edit"
                    type="email"
                    value={editFormState.email || ''} 
                    onChange={(e) => setEditFormState(prev => ({ ...prev, email: e.target.value }))} 
                    disabled={isPending}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="role-edit">Rol del Sistema</Label>
                <Select 
                    onValueChange={(value: EmployeeRole) => setEditFormState(prev => ({ ...prev, role: value }))} 
                    value={editFormState.role} 
                    disabled={isPending}
                >
                    <SelectTrigger id="role-edit">
                    <SelectValue placeholder="Seleccionar un rol" />
                    </SelectTrigger>
                    <SelectContent>
                    {roleOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" onClick={handleSaveUser} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Usuario</DialogTitle>
            <DialogDescription>Complete los datos para registrar un nuevo usuario en el sistema.</DialogDescription>
          </DialogHeader>
           <div className="space-y-4 py-4">
               <div className="space-y-2">
                  <Label htmlFor="email-add">Email *</Label>
                  <Input 
                    id="email-add"
                    type="email"
                    value={addFormState.email} 
                    onChange={(e) => setAddFormState(p => ({...p, email: e.target.value}))} 
                    placeholder="usuario@sacde.com.ar"
                    disabled={isPending}
                  />
               </div>
               <div className="space-y-2">
                    <Label htmlFor="role-add">Rol del Sistema *</Label>
                    <Select onValueChange={(value: EmployeeRole) => setAddFormState(p => ({...p, role: value}))} value={addFormState.role} disabled={isPending}>
                        <SelectTrigger id="role-add"><SelectValue placeholder="Seleccionar un rol" /></SelectTrigger>
                        <SelectContent>
                            {roleOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>Cancelar</Button></DialogClose>
            <Button type="submit" onClick={handleAddUser} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
