
"use client";

import { useState, useTransition, useMemo } from "react";
import { useTranslations } from "next-intl";
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
import { Combobox } from "@/components/ui/combobox";
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
import type { Employee, EmployeeRole, User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { updateUser, addUser } from "@/app/actions";

interface UsersManagerProps {
  initialUsers: User[];
  initialEmployees: Employee[];
}

const emptyAddForm = {
    employeeId: "",
    email: "",
    role: "unassigned" as EmployeeRole,
};

export default function UsersManager({ initialUsers, initialEmployees }: UsersManagerProps) {
  const t = useTranslations('UsersManager');
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editFormState, setEditFormState] = useState<Partial<User>>({});
  const [addFormState, setAddFormState] = useState(emptyAddForm);
  const [isPending, startTransition] = useTransition();
  
  const employeeMap = useMemo(() => new Map(initialEmployees.map(e => [e.id, e])), [initialEmployees]);
  
  const filteredUsers = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
    if (!lowerCaseSearchTerm) {
      return users;
    }
    return users.filter((user) => {
      const employee = employeeMap.get(user.employeeId);
      const fullName = employee ? `${employee.nombre} ${employee.apellido}`.toLowerCase() : '';
      const email = user.email.toLowerCase();
      return fullName.includes(lowerCaseSearchTerm) || email.includes(lowerCaseSearchTerm);
    });
  }, [users, searchTerm, employeeMap]);

  const unassignedEmployees = useMemo(() => {
    const assignedEmployeeIds = new Set(users.map(u => u.employeeId));
    return initialEmployees
        .filter(e => !assignedEmployeeIds.has(e.id))
        .map(e => ({ value: e.id, label: `${e.apellido}, ${e.nombre} (L: ${e.legajo})`}));
  }, [users, initialEmployees]);

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
        const updatedUser = await updateUser(editingUser.id, { email: editFormState.email, role: editFormState.role });
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        
        const employeeName = employeeMap.get(updatedUser.employeeId);
        toast({
          title: t('toast.userUpdatedTitle'),
          description: t('toast.userUpdatedDescription', { name: `${employeeName?.nombre} ${employeeName?.apellido}` }),
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
    const { employeeId, email, role } = addFormState;
    if (!employeeId || !email || !role) {
      toast({
        title: t('toast.validationErrorTitle'),
        description: t('toast.validationErrorDescription'),
        variant: "destructive",
      });
      return;
    }
    
    startTransition(async () => {
      try {
        const newUser = await addUser(addFormState);
        setUsers((prev) => [...prev, newUser]);
        const employeeName = employeeMap.get(newUser.employeeId);
        toast({
          title: t('toast.userAddedTitle'),
          description: t('toast.userAddedDescription', { name: `${employeeName?.nombre} ${employeeName?.apellido}` }),
        });
        setIsAddDialogOpen(false);
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : t('toast.unexpectedError');
        toast({
          title: t('toast.addErrorTitle'),
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
                  filteredUsers.map((user) => {
                    const employee = employeeMap.get(user.employeeId);
                    return (
                        <TableRow key={user.id}>
                        <TableCell className="font-medium">{employee ? `${employee.apellido}, ${employee.nombre}` : 'Empleado no encontrado'}</TableCell>
                        <TableCell>{user.email}</TableCell>
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
                            <span className="sr-only">{t('editSr', { name: employee ? employee.nombre : '' })}</span>
                            </Button>
                        </TableCell>
                        </TableRow>
                    );
                  })
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
          <div className="space-y-4 py-4">
            <div className="font-medium">
                {editingUser && employeeMap.has(editingUser.employeeId) 
                    ? `${employeeMap.get(editingUser.employeeId)?.apellido}, ${employeeMap.get(editingUser.employeeId)?.nombre}`
                    : 'Usuario'
                }
            </div>
            <div className="space-y-2">
                <Label htmlFor="email-edit">{t('tableHeaderEmail')}</Label>
                <Input 
                    id="email-edit"
                    type="email"
                    value={editFormState.email || ''} 
                    onChange={(e) => setEditFormState(prev => ({ ...prev, email: e.target.value }))} 
                    disabled={isPending}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="role-edit">{t('roleLabel')}</Label>
                <Select 
                    onValueChange={(value: EmployeeRole) => setEditFormState(prev => ({ ...prev, role: value }))} 
                    value={editFormState.role} 
                    disabled={isPending}
                >
                    <SelectTrigger id="role-edit">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addUserDialogTitle')}</DialogTitle>
            <DialogDescription>{t('addUserDialogDescription')}</DialogDescription>
          </DialogHeader>
           <div className="space-y-4 py-4">
               <div className="space-y-2">
                   <Label htmlFor="employeeId-add">{t('EmployeesManager.tableHeaderName')}</Label>
                   <Combobox
                    options={unassignedEmployees}
                    value={addFormState.employeeId}
                    onValueChange={(value) => setAddFormState(p => ({...p, employeeId: value}))}
                    placeholder={t('EmployeesManager.selectEmployeePlaceholder')}
                    searchPlaceholder={t('EmployeesManager.searchEmployeePlaceholder')}
                    emptyMessage={t('EmployeesManager.employeeNotFound')}
                    disabled={isPending}
                   />
               </div>
               <div className="space-y-2">
                  <Label htmlFor="email-add">{t('tableHeaderEmail')}</Label>
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
                    <Label htmlFor="role-add">{t('roleLabel')}</Label>
                    <Select onValueChange={(value: EmployeeRole) => setAddFormState(p => ({...p, role: value}))} value={addFormState.role} disabled={isPending}>
                        <SelectTrigger id="role-add"><SelectValue placeholder={t('selectRolePlaceholder')} /></SelectTrigger>
                        <SelectContent>
                            {roleOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
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
