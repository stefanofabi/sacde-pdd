
"use client";

import { useState, useTransition, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import { Loader2, Search, Pencil, PlusCircle, CalendarIcon } from "lucide-react";
import type { Employee, EmployeeRole, Obra, EmployeeCondition, EmployeeStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { updateEmployee, addEmployee } from "@/app/actions";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";

interface UsersManagerProps {
  initialUsers: Employee[];
  initialObras: Obra[];
}

const emptyAddForm = {
    legajo: "",
    cuil: "",
    apellido: "",
    nombre: "",
    fechaIngreso: undefined as Date | undefined,
    obraId: "",
    denominacionPosicion: "",
    condicion: "" as EmployeeCondition | "",
    estado: "" as EmployeeStatus | "",
    celular: "",
    correo: "",
    role: "unassigned" as EmployeeRole
};

export default function UsersManager({ initialUsers, initialObras }: UsersManagerProps) {
  const t = useTranslations('UsersManager');
  const locale = useLocale();
  const dateLocale = locale === 'es' ? es : enUS;
  const { toast } = useToast();
  
  const [users, setUsers] = useState<Employee[]>(initialUsers);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editFormState, setEditFormState] = useState<Partial<Employee>>({});
  const [addFormState, setAddFormState] = useState(emptyAddForm);
  const [isPending, startTransition] = useTransition();

  const filteredUsers = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
    if (!lowerCaseSearchTerm) {
      return users;
    }
    return users.filter((user) => {
      const fullName = `${user.nombre} ${user.apellido}`.toLowerCase();
      const email = (user.correo || '').toLowerCase();
      return fullName.includes(lowerCaseSearchTerm) || email.includes(lowerCaseSearchTerm);
    });
  }, [users, searchTerm]);
  
  const handleInputChange = (form: 'edit' | 'add', field: keyof Employee, value: any) => {
    if (form === 'edit') {
      setEditFormState(prev => ({ ...prev, [field]: value }));
    } else {
      setAddFormState(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleOpenEditDialog = (user: Employee) => {
    setEditingUser(user);
    setEditFormState({
      apellido: user.apellido,
      nombre: user.nombre,
      role: user.role,
      correo: user.correo,
    });
    setIsEditDialogOpen(true);
  };
  
  const handleOpenAddDialog = () => {
    setAddFormState(emptyAddForm);
    setIsAddDialogOpen(true);
  }

  const handleSaveUser = () => {
    if (!editingUser) return;

    startTransition(async () => {
      try {
        const updatedUser = await updateEmployee(editingUser.id, editFormState);
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        toast({
          title: t('toast.userUpdatedTitle'),
          description: t('toast.userUpdatedDescription', { name: `${updatedUser.nombre} ${updatedUser.apellido}` }),
        });
        setIsEditDialogOpen(false);
        setEditingUser(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('toast.unexpectedError');
        toast({
          title: t('toast.updateErrorTitle'),
          description: errorMessage,
          variant: "destructive",
        });
      }
    });
  };
  
  const handleAddUser = () => {
    const { legajo, apellido, nombre, obraId, denominacionPosicion, condicion, estado, fechaIngreso, correo } = addFormState;
    const requiredFields = ['legajo', 'apellido', 'nombre', 'obraId', 'denominacionPosicion', 'condicion', 'estado', 'fechaIngreso', 'correo', 'role'];
    const missingField = requiredFields.some(field => !addFormState[field as keyof typeof addFormState]);

    if (missingField) {
      toast({
        title: t('UsersManager.toast.validationErrorTitle'),
        description: t('UsersManager.toast.validationErrorDescription'),
        variant: "destructive",
      });
      return;
    }
    
    if (!/^\d+$/.test(legajo)) {
        toast({
            title: t('UsersManager.toast.validationErrorTitle'),
            description: t('UsersManager.toast.legajoValidationError'),
            variant: "destructive",
        });
        return;
    }
    
    const userData = {
        ...addFormState,
        fechaIngreso: format(addFormState.fechaIngreso!, "yyyy-MM-dd"),
    };

    startTransition(async () => {
      try {
        const newUser = await addEmployee(userData);
        setUsers((prev) => [...prev, newUser]);
        toast({
          title: t('UsersManager.toast.userAddedTitle'),
          description: t('UsersManager.toast.userAddedDescription', { name: `${newUser.nombre} ${newUser.apellido}` }),
        });
        setIsAddDialogOpen(false);
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : t('toast.unexpectedError');
        toast({
          title: t('UsersManager.toast.addErrorTitle'),
          description: errorMessage,
          variant: "destructive",
        });
      }
    });
  };

  const roleOptions: { value: EmployeeRole; label: string }[] = [
    { value: 'admin', label: t('roles.admin') },
    { value: 'crew_manager', label: t('roles.crew_manager') },
    { value: 'foreman', label: t('roles.foreman') },
    { value: 'tallyman', label: t('roles.tallyman') },
    { value: 'project_manager', label: t('roles.project_manager') },
    { value: 'management_control', label: t('roles.management_control') },
    { value: 'recursos_humanos', label: t('roles.recursos_humanos') },
    { value: 'unassigned', label: t('roles.unassigned') },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>{t('cardTitle')}</CardTitle>
              <CardDescription>{t('cardDescription')}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t('searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-[250px]"
                />
                </div>
                 <Button onClick={handleOpenAddDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('addUserButton')}
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('tableHeaderName')}</TableHead>
                  <TableHead>{t('tableHeaderEmail')}</TableHead>
                  <TableHead>{t('tableHeaderRole')}</TableHead>
                  <TableHead className="text-right w-[120px]">{t('tableHeaderActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{`${user.apellido}, ${user.nombre}`}</TableCell>
                      <TableCell>{user.correo || 'N/A'}</TableCell>
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
                          <span className="sr-only">{t('editSr', { name: user.nombre })}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      {users.length === 0 ? t('noUsersFound') : t('noUsersWithFilter')}
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
            <DialogTitle>{t('editUserDialogTitle')}</DialogTitle>
            <DialogDescription>{t('editUserDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <h3 className="mb-4 text-lg font-medium leading-none">{t('personalInfoTitle')}</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Nombre</Label>
                  <Input 
                    value={editFormState.nombre || ''} 
                    onChange={(e) => handleInputChange('edit', 'nombre', e.target.value)} 
                    className="col-span-3"
                    disabled={isPending}
                  />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Apellido</Label>
                  <Input 
                    value={editFormState.apellido || ''} 
                    onChange={(e) => handleInputChange('edit', 'apellido', e.target.value)} 
                    className="col-span-3"
                    disabled={isPending}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Email</Label>
                  <Input 
                    type="email"
                    value={editFormState.correo || ''} 
                    onChange={(e) => handleInputChange('edit', 'correo', e.target.value)} 
                    className="col-span-3"
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>
            <Separator />
            <div>
               <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">{t('roleLabel')}</Label>
                  <Select 
                    onValueChange={(value: EmployeeRole) => handleInputChange('edit', 'role', value)} 
                    value={editFormState.role} 
                    disabled={isPending}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder={t('selectRolePlaceholder')} />
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
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>{t('cancelButton')}</Button>
            </DialogClose>
            <Button type="submit" onClick={handleSaveUser} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('saveChangesButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('addUserDialogTitle')}</DialogTitle>
            <DialogDescription>{t('addUserDialogDescription')}</DialogDescription>
          </DialogHeader>
           <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-6">
            <div>
              <h3 className="mb-4 text-lg font-medium leading-none">{t('EmployeesManager.personalInfoTitle')}</h3>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="legajo" className="text-right">{t('EmployeesManager.legajoLabel')} *</Label>
                  <Input id="legajo" value={addFormState.legajo} onChange={(e) => handleInputChange('add', 'legajo', e.target.value)} className="col-span-3" placeholder="Ej. 12345" disabled={isPending} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cuil" className="text-right">{t('EmployeesManager.cuilLabel')}</Label>
                  <Input id="cuil" value={addFormState.cuil} onChange={(e) => handleInputChange('add', 'cuil', e.target.value)} className="col-span-3" placeholder="Ej. 20-12345678-9" disabled={isPending}/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="apellido" className="text-right">{t('EmployeesManager.lastNameLabel')} *</Label>
                  <Input id="apellido" value={addFormState.apellido} onChange={(e) => handleInputChange('add', 'apellido', e.target.value)} className="col-span-3" placeholder="Pérez" disabled={isPending}/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nombre" className="text-right">{t('EmployeesManager.firstNameLabel')} *</Label>
                  <Input id="nombre" value={addFormState.nombre} onChange={(e) => handleInputChange('add', 'nombre', e.target.value)} className="col-span-3" placeholder="Juan" disabled={isPending}/>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-4 text-lg font-medium leading-none">{t('EmployeesManager.workInfoTitle')}</h3>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="correo" className="text-right">{t('EmployeesManager.emailLabel')} *</Label>
                    <Input id="correo" type="email" value={addFormState.correo} onChange={(e) => handleInputChange('add', 'correo', e.target.value)} className="col-span-3" placeholder="usuario@sacde.com" disabled={isPending}/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">{t('roleLabel')} *</Label>
                    <Select onValueChange={(value: EmployeeRole) => handleInputChange('add', 'role', value)} value={addFormState.role} disabled={isPending}>
                        <SelectTrigger className="col-span-3"><SelectValue placeholder={t('selectRolePlaceholder')} /></SelectTrigger>
                        <SelectContent>
                            {roleOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="fechaIngreso" className="text-right">{t('EmployeesManager.hireDateLabel')} *</Label>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button variant="outline" className="col-span-3 justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {addFormState.fechaIngreso ? format(addFormState.fechaIngreso, 'PPP', { locale: dateLocale }) : <span>{t('EmployeesManager.selectDatePlaceholder')}</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={addFormState.fechaIngreso} onSelect={(date) => handleInputChange('add', 'fechaIngreso', date)} initialFocus locale={dateLocale} /></PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="obraId" className="text-right">{t('EmployeesManager.projectLabel')} *</Label>
                   <Select onValueChange={(value) => handleInputChange('add', 'obraId', value)} value={addFormState.obraId} disabled={isPending}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder={t('EmployeesManager.selectProjectPlaceholder')} /></SelectTrigger>
                    <SelectContent>{initialObras.map((obra) => <SelectItem key={obra.id} value={obra.id}>{obra.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="denominacionPosicion" className="text-right">{t('EmployeesManager.positionLabel')} *</Label>
                  <Input id="denominacionPosicion" value={addFormState.denominacionPosicion} onChange={(e) => handleInputChange('add', 'denominacionPosicion', e.target.value)} className="col-span-3" placeholder={t('EmployeesManager.positionPlaceholder')} disabled={isPending}/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="condicion" className="text-right">{t('EmployeesManager.conditionLabel')} *</Label>
                   <Select onValueChange={(value: EmployeeCondition) => handleInputChange('add', 'condicion', value)} value={addFormState.condicion} disabled={isPending}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder={t('EmployeesManager.selectConditionPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jornal">{t('EmployeesManager.conditions.jornal')}</SelectItem>
                      <SelectItem value="mensual">{t('EmployeesManager.conditions.mensual')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="estado" className="text-right">{t('EmployeesManager.statusLabel')} *</Label>
                   <Select onValueChange={(value: EmployeeStatus) => handleInputChange('add', 'estado', value)} value={addFormState.estado} disabled={isPending}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder={t('EmployeesManager.selectStatusPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">{t('EmployeesManager.statuses.activo')}</SelectItem>
                      <SelectItem value="suspendido">{t('EmployeesManager.statuses.suspendido')}</SelectItem>
                      <SelectItem value="baja">{t('EmployeesManager.statuses.baja')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="celular" className="text-right">{t('EmployeesManager.cellPhoneLabel')}</Label>
                    <Input id="celular" value={addFormState.celular} onChange={(e) => handleInputChange('add', 'celular', e.target.value)} className="col-span-3" placeholder="Ej. 1122334455" disabled={isPending}/>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>{t('cancelButton')}</Button></DialogClose>
            <Button type="submit" onClick={handleAddUser} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('saveUserButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
