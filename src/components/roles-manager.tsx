
"use client";

import { useState, useTransition, useMemo } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Trash2, Pencil, PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import type { Role, PermissionKey } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { db } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, updateDoc, getDocs, query, where } from "firebase/firestore";

interface RolesManagerProps {
  initialRoles: Role[];
}

const allPermissions: { id: PermissionKey; label: string }[] = [
    { id: 'dashboard', label: 'Acceso al Dashboard' },
    { id: 'crews', label: 'Gestión de Cuadrillas' },
    { id: 'employees', label: 'Gestión de Empleados' },
    { id: 'users', label: 'Gestión de Usuarios' },
    { id: 'attendance', label: 'Gestión de Asistencias' },
    { id: 'dailyReports', label: 'Gestión de Partes Diarios' },
    { id: 'statistics', label: 'Acceso a Estadísticas' },
    { id: 'permissions', label: 'Gestión de Ausentismos' },
    { id: 'settings', label: 'Acceso a Ajustes' },
];

export default function RolesManager({ initialRoles }: RolesManagerProps) {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>(initialRoles.sort((a, b) => a.name.localeCompare(b.name)));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [formState, setFormState] = useState<{ name: string; permissions: PermissionKey[] }>({ name: "", permissions: [] });
  const [isPending, startTransition] = useTransition();

  const handleOpenAddDialog = () => {
    setEditingRole(null);
    setFormState({ name: "", permissions: [] });
    setIsFormOpen(true);
  };

  const handleOpenEditDialog = (role: Role) => {
    setEditingRole(role);
    setFormState({ name: role.name, permissions: role.permissions || [] });
    setIsFormOpen(true);
  };

  const handlePermissionChange = (permissionId: PermissionKey, checked: boolean) => {
    setFormState(prev => {
      const newPermissions = checked
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter(p => p !== permissionId);
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleSaveRole = () => {
    if (!formState.name.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre del rol no puede estar vacío.",
        variant: "destructive",
      });
      return;
    }
    startTransition(async () => {
      try {
        if (editingRole) {
          const roleDocRef = doc(db, 'roles', editingRole.id);
          await updateDoc(roleDocRef, formState);
          const updatedRole = { id: editingRole.id, ...formState } as Role;
          setRoles(prev => prev.map(r => r.id === updatedRole.id ? updatedRole : r));
          toast({ title: "Rol actualizado", description: `El rol "${updatedRole.name}" ha sido actualizado.` });
        } else {
          const docRef = await addDoc(collection(db, 'roles'), formState);
          const newRole = { id: docRef.id, ...formState } as Role;
          setRoles(prev => [...prev, newRole].sort((a, b) => a.name.localeCompare(b.name)));
          toast({ title: "Rol creado", description: `El rol "${newRole.name}" ha sido creado.` });
        }
        setIsFormOpen(false);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "No se pudo guardar el rol.",
          variant: "destructive",
        });
      }
    });
  };

  const handleDeleteRole = () => {
    if (!roleToDelete) return;

    startTransition(async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("roleId", "==", roleToDelete.id));
        const usersWithRole = await getDocs(q);

        if (!usersWithRole.empty) {
            throw new Error(`No se puede eliminar. ${usersWithRole.size} usuario(s) tienen este rol asignado.`);
        }

        await deleteDoc(doc(db, 'roles', roleToDelete.id));
        setRoles(prev => prev.filter(r => r.id !== roleToDelete.id));
        toast({ title: "Rol eliminado", description: `El rol "${roleToDelete.name}" ha sido eliminado.` });
      } catch (error) {
        toast({
          title: "Error al eliminar",
          description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
          variant: "destructive",
        });
      } finally {
        setRoleToDelete(null);
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestión de Roles</CardTitle>
              <CardDescription>Cree roles y asigne permisos a las distintas secciones del sistema.</CardDescription>
            </div>
            <Button onClick={handleOpenAddDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Agregar Rol
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del Rol</TableHead>
                  <TableHead className="text-center">Permisos Asignados</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.length > 0 ? (
                  roles.map(role => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="text-center">{role.permissions?.length || 0} / {allPermissions.length}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(role)} disabled={isPending}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setRoleToDelete(role)} disabled={isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">No hay roles creados.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Editar Rol" : "Crear Nuevo Rol"}</DialogTitle>
            <DialogDescription>Defina un nombre para el rol y seleccione los permisos que tendrá.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="role-name">Nombre del Rol</Label>
              <Input
                id="role-name"
                value={formState.name}
                onChange={(e) => setFormState(p => ({ ...p, name: e.target.value }))}
                placeholder="Ej. Jefe de Obra"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Permisos</h3>
              <div className="grid grid-cols-2 gap-4 rounded-md border p-4 max-h-64 overflow-y-auto">
                {allPermissions.map(permission => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`perm-${permission.id}`}
                      checked={formState.permissions.includes(permission.id)}
                      onCheckedChange={(checked) => handlePermissionChange(permission.id, !!checked)}
                      disabled={isPending}
                    />
                    <Label htmlFor={`perm-${permission.id}`} className="font-normal cursor-pointer">{permission.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary" disabled={isPending}>Cancelar</Button></DialogClose>
            <Button onClick={handleSaveRole} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingRole ? "Guardar Cambios" : "Crear Rol"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!roleToDelete} onOpenChange={setRoleToDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este rol?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el rol "{roleToDelete?.name}". No podrá eliminar un rol si está asignado a algún usuario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} disabled={isPending} className={buttonVariants({ variant: "destructive" })}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sí, eliminar rol
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
