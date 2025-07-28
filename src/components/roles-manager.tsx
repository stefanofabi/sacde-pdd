
"use client";

import { useState, useTransition } from "react";
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
import { Separator } from "./ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

interface RolesManagerProps {
  initialRoles: Role[];
}

interface PermissionDefinition {
    id: PermissionKey;
    label: string;
    subPermissions?: PermissionDefinition[];
}

const permissionGroups: { category: string; permissions: PermissionDefinition[] }[] = [
    {
        category: "Acceso General",
        permissions: [
            { id: 'dashboard', label: 'Acceso al Dashboard' },
            { id: 'users', label: 'Gestión de Usuarios' },
            { id: 'attendance', label: 'Gestión de Asistencias' },
            { id: 'statistics', label: 'Acceso a Estadísticas' },
        ]
    },
    {
        category: "Gestión de Cuadrillas",
        permissions: [
            {
                id: 'crews',
                label: 'Acceso General a Cuadrillas',
                subPermissions: [
                    { id: 'crews.view', label: 'Visualizar Cuadrillas' },
                    { id: 'crews.editInfo', label: 'Editar Información Principal' },
                    { id: 'crews.assignPhase', label: 'Asignar Fases' },
                    { id: 'crews.managePersonnel', label: 'Agregar/Eliminar Personal' },
                ]
            }
        ]
    },
    {
        category: "Gestión de Empleados",
        permissions: [
            {
                id: 'employees',
                label: 'Acceso General a Empleados',
                subPermissions: [
                    { id: 'employees.view', label: 'Visualizar Empleados' },
                    { id: 'employees.manage', label: 'Gestionar Empleados (Crear/Editar/Eliminar)' },
                ]
            }
        ]
    },
    {
        category: "Gestión de Ausentismos",
        permissions: [
            {
                id: 'permissions',
                label: 'Acceso General a Ausentismos',
                subPermissions: [
                    { id: 'permissions.view', label: 'Ver Ausentismos' },
                    { id: 'permissions.manage', label: 'Gestionar Ausentismos (Crear/Editar/Eliminar)' },
                    { id: 'permissions.approveSupervisor', label: 'Aprobar (Supervisor)' },
                    { id: 'permissions.approveHR', label: 'Aprobar (RRHH)' },
                ]
            }
        ]
    },
    {
        category: "Partes Diarios",
        permissions: [
            { 
                id: 'dailyReports', 
                label: 'Acceso General a Partes Diarios',
                subPermissions: [
                    { id: 'dailyReports.view', label: 'Visualizar Partes Diarios' },
                    { id: 'dailyReports.save', label: 'Guardar Parte' },
                    { id: 'dailyReports.notify', label: 'Notificar Parte' },
                    { id: 'dailyReports.addManual', label: 'Cargar Personal Manual' },
                    { id: 'dailyReports.moveEmployee', label: 'Mover Personal' },
                    { id: 'dailyReports.delete', label: 'Eliminar Parte Diario' },
                    { id: 'dailyReports.approveControl', label: 'Aprobar (Control y Gestión)' },
                    { id: 'dailyReports.approvePM', label: 'Aprobar (Jefe de Obra)' },
                ]
            },
        ]
    },
    {
        category: "Configuración",
        permissions: [
            { 
                id: 'settings', 
                label: 'Acceso General a Ajustes',
                subPermissions: [
                    { id: 'settings.projects', label: 'Gestionar Proyectos' },
                    { id: 'settings.phases', label: 'Gestionar Fases' },
                    { id: 'settings.positions', label: 'Gestionar Posiciones' },
                    { id: 'settings.absenceTypes', label: 'Gestionar Tipos de Ausentismo' },
                    { id: 'settings.specialHourTypes', label: 'Gestionar Tipos de Horas Especiales' },
                    { id: 'settings.unproductiveHourTypes', label: 'Gestionar Tipos de Horas Improductivas' },
                    { id: 'settings.roles', label: 'Gestionar Roles' },
                ]
            },
        ]
    }
];

const allPermissions = permissionGroups.flatMap(g => g.permissions.flatMap(p => p.subPermissions ? [p, ...p.subPermissions] : [p]));

export default function RolesManager({ initialRoles }: RolesManagerProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
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
      let currentPermissions = new Set(prev.permissions);
      const definition = allPermissions.find(p => p.id === permissionId);

      if (checked) {
        currentPermissions.add(permissionId);
        // If a sub-permission is checked, ensure its parent is also checked
        const parent = permissionGroups.flatMap(g => g.permissions).find(p => p.subPermissions?.some(sp => sp.id === permissionId));
        if (parent) {
          currentPermissions.add(parent.id);
        }
        // If a parent is checked, check all its children
        if (definition?.subPermissions) {
          definition.subPermissions.forEach(sp => currentPermissions.add(sp.id));
        }
      } else {
        currentPermissions.delete(permissionId);
        // If a parent is unchecked, uncheck all its children
        if (definition?.subPermissions) {
          definition.subPermissions.forEach(sp => currentPermissions.delete(sp.id));
        }
      }

      return { ...prev, permissions: Array.from(currentPermissions) };
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

  const MobileRoleCard = ({ role }: { role: Role }) => (
    <Card>
      <CardHeader>
        <CardTitle>{role.name}</CardTitle>
        <CardDescription>
          {role.permissions?.length || 0} de {allPermissions.length} permisos asignados.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(role)} disabled={isPending}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setRoleToDelete(role)} disabled={isPending}>
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Gestión de Roles</CardTitle>
              <CardDescription>Cree roles y asigne permisos a las distintas secciones del sistema.</CardDescription>
            </div>
            <Button onClick={handleOpenAddDialog} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Agregar Rol
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isMobile ? (
            <div className="space-y-4">
              {roles.map(role => <MobileRoleCard key={role.id} role={role} />)}
            </div>
          ) : (
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
          )}
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
              <div className="rounded-md border p-4 max-h-64 overflow-y-auto space-y-4">
                {permissionGroups.map((group, index) => (
                    <div key={group.category}>
                        <h4 className="font-semibold text-foreground mb-2">{group.category}</h4>
                        <div className="space-y-2">
                            {group.permissions.map(permission => {
                                const isParentChecked = formState.permissions.includes(permission.id);
                                return (
                                <div key={permission.id}>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`perm-${permission.id}`}
                                            checked={isParentChecked}
                                            onCheckedChange={(checked) => handlePermissionChange(permission.id, !!checked)}
                                            disabled={isPending}
                                        />
                                        <Label htmlFor={`perm-${permission.id}`} className="font-normal cursor-pointer">{permission.label}</Label>
                                    </div>
                                    {permission.subPermissions && (
                                    <div className="pl-6 pt-2 space-y-2">
                                        {permission.subPermissions.map(subPerm => (
                                            <div key={subPerm.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`perm-${subPerm.id}`}
                                                    checked={formState.permissions.includes(subPerm.id)}
                                                    onCheckedChange={(checked) => handlePermissionChange(subPerm.id, !!checked)}
                                                    disabled={isPending || !isParentChecked}
                                                />
                                                <Label htmlFor={`perm-${subPerm.id}`} className="font-normal cursor-pointer text-muted-foreground">{subPerm.label}</Label>
                                            </div>
                                        ))}
                                    </div>
                                    )}
                                </div>
                            )})}
                        </div>
                        {index < permissionGroups.length - 1 && <Separator className="mt-4" />}
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
