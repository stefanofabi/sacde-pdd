
"use client";

import { useState, useTransition, useMemo } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
import { Loader2, Search, Pencil, PlusCircle, Trash2 } from "lucide-react";
import type { Role, User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { updateDoc, doc } from "firebase/firestore";
import { createUser, deleteUser } from "@/app/actions";
import { Switch } from "./ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";

interface UsersManagerProps {
  initialUsers: User[];
  initialRoles: Role[];
}

const emptyAddForm = {
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    confirmPassword: "",
    roleId: "",
    is_superuser: false,
};

export default function UsersManager({ initialUsers, initialRoles }: UsersManagerProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editFormState, setEditFormState] = useState<Partial<User>>({});
  const [addFormState, setAddFormState] = useState(emptyAddForm);
  const [isPending, startTransition] = useTransition();

  const roleMap = useMemo(() => new Map(roles.map(r => [r.id, r.name])), [roles]);
  
  const filteredUsers = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
    if (!lowerCaseSearchTerm) {
      return users.sort((a, b) => a.apellido.localeCompare(b.apellido));
    }
    return users.filter((user) => {
      const fullName = `${user.nombre} ${user.apellido}`.toLowerCase();
      const email = user.email.toLowerCase();
      return fullName.includes(lowerCaseSearchTerm) || email.includes(lowerCaseSearchTerm);
    }).sort((a, b) => a.apellido.localeCompare(b.apellido));
  }, [users, searchTerm]);


  const handleOpenEditDialog = (user: User) => {
    setEditingUser(user);
    setEditFormState({
      email: user.email,
      roleId: user.roleId,
      nombre: user.nombre,
      apellido: user.apellido,
      is_superuser: user.is_superuser || false
    });
    setIsEditDialogOpen(true);
  };
  
  const handleOpenAddDialog = () => {
    setAddFormState(emptyAddForm);
    setIsAddDialogOpen(true);
  }

  const handleSaveUser = () => {
    if (!editingUser || !editFormState.email || !editFormState.roleId || !editFormState.nombre || !editFormState.apellido) return;

    startTransition(async () => {
      try {
        const userDataToUpdate = { 
          email: editFormState.email, 
          roleId: editFormState.roleId,
          nombre: editFormState.nombre,
          apellido: editFormState.apellido,
          is_superuser: editFormState.is_superuser || false,
        };
        
        const userDocRef = doc(db, "users", editingUser.id);
        await updateDoc(userDocRef, userDataToUpdate);
        
        const updatedUser = { ...editingUser, ...userDataToUpdate } as User;
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        
        toast({
          title: "Usuario Actualizado",
          description: `El usuario "${updatedUser.nombre} ${updatedUser.apellido}" ha sido actualizado.`,
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
    const { nombre, apellido, email, roleId, password, confirmPassword, is_superuser } = addFormState;
    if (!nombre || !apellido || !email || !roleId || !password || !confirmPassword) {
      toast({
        title: "Error de validación",
        description: "Debe completar todos los campos obligatorios (*).",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
        toast({
            title: "Error de validación",
            description: "Las contraseñas no coinciden.",
            variant: "destructive",
        });
        return;
    }
    
    startTransition(async () => {
      try {
        const newUser = await createUser({
            nombre: addFormState.nombre,
            apellido: addFormState.apellido,
            email: addFormState.email,
            roleId: addFormState.roleId,
            is_superuser: addFormState.is_superuser,
        }, password);

        setUsers((prev) => [...prev, newUser]);
        toast({
          title: "Usuario Creado",
          description: `El usuario "${newUser.nombre} ${newUser.apellido}" ha sido creado.`,
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

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    startTransition(async () => {
        try {
            await deleteUser(userToDelete.id);
            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
            toast({
                title: "Usuario eliminado",
                description: `El usuario "${userToDelete.nombre} ${userToDelete.apellido}" ha sido eliminado con éxito.`,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
            toast({
                title: "Error al eliminar",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setUserToDelete(null);
        }
    });
  };

  const MobileUserCard = ({ user }: { user: User }) => (
    <Card>
        <CardHeader>
            <CardTitle>{`${user.apellido}, ${user.nombre}`}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
                <strong>Rol:</strong>
                <Badge variant="secondary">{roleMap.get(user.roleId) || 'Sin Rol'}</Badge>
            </div>
            {user.is_superuser && <Badge>Superuser</Badge>}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
             <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEditDialog(user)}
                disabled={isPending}
            >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
            </Button>
            <Button
                variant="destructive"
                size="sm"
                onClick={() => setUserToDelete(user)}
                disabled={isPending}
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
            </Button>
        </CardFooter>
    </Card>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Lista de Usuarios</CardTitle>
              <CardDescription>Busque usuarios y gestione sus roles y permisos.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                      placeholder="Buscar por nombre o email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full"
                  />
                </div>
                 <Button onClick={handleOpenAddDialog} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar Usuario
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isMobile ? (
            <div className="space-y-4">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => <MobileUserCard key={user.id} user={user} />)
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {initialUsers.length === 0 ? "No hay usuarios." : "No se encontraron usuarios con el filtro aplicado."}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre y Apellido</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-right w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => {
                          const fullName = `${user.apellido}, ${user.nombre}`;
                          return (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                      {fullName}
                                      {user.is_superuser && <Badge>Superuser</Badge>}
                                  </div>
                              </TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                  <Badge variant="secondary">{roleMap.get(user.roleId) || 'Sin Rol'}</Badge>
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
                                  <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:bg-destructive/10"
                                      onClick={() => setUserToDelete(user)}
                                      disabled={isPending}
                                  >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Eliminar {user.email}</span>
                                  </Button>
                              </TableCell>
                            </TableRow>
                          );
                      })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        {initialUsers.length === 0 ? "No hay usuarios." : "No se encontraron usuarios con el filtro aplicado."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditingUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Modifique los datos del usuario.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
                <Label htmlFor="apellido-edit">Apellido</Label>
                <Input 
                    id="apellido-edit"
                    value={editFormState.apellido || ''} 
                    onChange={(e) => setEditFormState(prev => ({ ...prev, apellido: e.target.value }))} 
                    disabled={isPending}
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="nombre-edit">Nombre</Label>
                <Input 
                    id="nombre-edit"
                    value={editFormState.nombre || ''} 
                    onChange={(e) => setEditFormState(prev => ({ ...prev, nombre: e.target.value }))} 
                    disabled={isPending}
                />
            </div>
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
                    onValueChange={(value: string) => setEditFormState(prev => ({ ...prev, roleId: value }))} 
                    value={editFormState.roleId} 
                    disabled={isPending}
                >
                    <SelectTrigger id="role-edit">
                    <SelectValue placeholder="Seleccionar un rol" />
                    </SelectTrigger>
                    <SelectContent>
                    {roles.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                        {opt.name}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center space-x-2">
                <Switch
                    id="is_superuser-edit"
                    checked={editFormState.is_superuser}
                    onCheckedChange={(checked) => setEditFormState(prev => ({ ...prev, is_superuser: checked }))}
                    disabled={isPending}
                />
                <Label htmlFor="is_superuser-edit">¿Es Superusuario?</Label>
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
           <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                <div className="space-y-2">
                  <Label htmlFor="apellido-add">Apellido *</Label>
                  <Input 
                    id="apellido-add"
                    value={addFormState.apellido} 
                    onChange={(e) => setAddFormState(p => ({...p, apellido: e.target.value}))} 
                    placeholder="Apellido del usuario"
                    disabled={isPending}
                  />
               </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre-add">Nombre *</Label>
                  <Input 
                    id="nombre-add"
                    value={addFormState.nombre} 
                    onChange={(e) => setAddFormState(p => ({...p, nombre: e.target.value}))} 
                    placeholder="Nombre del usuario"
                    disabled={isPending}
                  />
               </div>
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
                  <Label htmlFor="password-add">Contraseña *</Label>
                  <Input 
                    id="password-add"
                    type="password"
                    value={addFormState.password} 
                    onChange={(e) => setAddFormState(p => ({...p, password: e.target.value}))} 
                    placeholder="Mínimo 6 caracteres"
                    disabled={isPending}
                  />
               </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword-add">Confirmar Contraseña *</Label>
                  <Input 
                    id="confirmPassword-add"
                    type="password"
                    value={addFormState.confirmPassword} 
                    onChange={(e) => setAddFormState(p => ({...p, confirmPassword: e.target.value}))} 
                    placeholder="Repita la contraseña"
                    disabled={isPending}
                  />
               </div>
               <div className="space-y-2">
                    <Label htmlFor="role-add">Rol del Sistema *</Label>
                    <Select onValueChange={(value: string) => setAddFormState(p => ({...p, roleId: value}))} value={addFormState.roleId} disabled={isPending}>
                        <SelectTrigger id="role-add"><SelectValue placeholder="Seleccionar un rol" /></SelectTrigger>
                        <SelectContent>
                            {roles.map((opt) => <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                    <Switch
                        id="is_superuser-add"
                        checked={addFormState.is_superuser}
                        onCheckedChange={(checked) => setAddFormState(p => ({...p, is_superuser: checked}))}
                        disabled={isPending}
                    />
                    <Label htmlFor="is_superuser-add">¿Es Superusuario?</Label>
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

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente al usuario "{`${userToDelete?.nombre} ${userToDelete?.apellido}`}" de la base de datos y del sistema de autenticación.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={isPending}>
                    Cancelar
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteUser} 
                  disabled={isPending}
                  className={buttonVariants({ variant: "destructive" })}
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, eliminar usuario"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
