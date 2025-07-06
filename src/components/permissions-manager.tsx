
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, CalendarIcon, Search, Trash2, Pencil } from "lucide-react";
import type { Permission, Employee, PermissionStatus, AbsenceType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addPermission, deletePermission, updatePermission } from "@/app/actions";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Input } from "@/components/ui/input";
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

interface PermissionsManagerProps {
  initialPermissions: Permission[];
  initialEmployees: Employee[];
  initialAbsenceTypes: AbsenceType[];
}

const emptyForm = {
    employeeId: "",
    absenceTypeId: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    status: "" as PermissionStatus | "",
    observations: "",
};

export default function PermissionsManager({ initialPermissions, initialEmployees, initialAbsenceTypes }: PermissionsManagerProps) {
    const t = useTranslations('PermissionsManager');
    const locale = useLocale();
    const dateLocale = locale === 'es' ? es : enUS;
    const { toast } = useToast();
    const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formState, setFormState] = useState(emptyForm);
    const [searchTerm, setSearchTerm] = useState("");
    const [activityFilter, setActivityFilter] = useState<"all" | "active" | "inactive">("all");
    const [permissionToDelete, setPermissionToDelete] = useState<Permission | null>(null);
    const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
    const [isPending, startTransition] = useTransition();

    const employeeMap = useMemo(() => {
        return new Map(initialEmployees.map(emp => [emp.id, `${emp.nombre} ${emp.apellido} (L: ${emp.legajo})`]));
    }, [initialEmployees]);
    
    const absenceTypeMap = useMemo(() => {
        return new Map(initialAbsenceTypes.map(at => [at.id, at.name]));
    }, [initialAbsenceTypes]);

    const employeeOptions = useMemo(() => {
        return initialEmployees.map(emp => ({
            value: emp.id,
            label: `${emp.nombre} ${emp.apellido} (L: ${emp.legajo})`
        }));
    }, [initialEmployees]);
    
    const absenceTypeOptions = useMemo(() => {
        return initialAbsenceTypes.map(at => ({
            value: at.id,
            label: `${at.name} (${at.code})`
        }));
    }, [initialAbsenceTypes]);

    const filteredPermissions = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return permissions
            .filter((perm) => {
                const employeeName = employeeMap.get(perm.employeeId) || '';
                return employeeName.toLowerCase().includes(searchTerm.toLowerCase());
            })
            .filter((perm) => {
                if (activityFilter === 'all') {
                    return true;
                }
                const startDate = new Date(perm.startDate + 'T00:00:00');
                const endDate = new Date(perm.endDate + 'T00:00:00');
                
                const isActive = today >= startDate && today <= endDate;

                return activityFilter === 'active' ? isActive : !isActive;
            })
            .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }, [permissions, searchTerm, activityFilter, employeeMap]);

    const handleInputChange = (field: keyof typeof emptyForm, value: any) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };
    
    const handleOpenAddDialog = () => {
        setEditingPermission(null);
        setFormState(emptyForm);
        setIsFormOpen(true);
    };

    const handleOpenEditDialog = (permission: Permission) => {
        setEditingPermission(permission);
        setFormState({
            ...permission,
            startDate: new Date(permission.startDate + 'T00:00:00'),
            endDate: new Date(permission.endDate + 'T00:00:00'),
            observations: permission.observations || '',
        });
        setIsFormOpen(true);
    };


    const handleSavePermission = () => {
        const { employeeId, startDate, endDate, status, absenceTypeId } = formState;
        if (!employeeId || !startDate || !endDate || !status || !absenceTypeId) {
            toast({
                title: t('toast.validationErrorTitle'),
                description: t('toast.validationErrorDescription'),
                variant: "destructive",
            });
            return;
        }

        if (endDate < startDate) {
            toast({
                title: t('toast.validationErrorTitle'),
                description: t('toast.dateValidationError'),
                variant: "destructive",
            });
            return;
        }
        
        const permissionData = {
            employeeId,
            absenceTypeId,
            startDate: format(startDate, "yyyy-MM-dd"),
            endDate: format(endDate, "yyyy-MM-dd"),
            status,
            observations: formState.observations || '',
        };

        startTransition(async () => {
            try {
                if (editingPermission) {
                    const updatedPermission = await updatePermission(editingPermission.id, permissionData);
                    setPermissions(prev => prev.map(p => p.id === updatedPermission.id ? updatedPermission : p));
                    toast({
                        title: t('toast.permissionUpdatedTitle'),
                        description: t('toast.permissionUpdatedDescription'),
                    });
                } else {
                    const newPermission = await addPermission(permissionData);
                    setPermissions(prev => [...prev, newPermission]);
                    toast({
                        title: t('toast.permissionAddedTitle'),
                        description: t('toast.permissionAddedDescription'),
                    });
                }
                setIsFormOpen(false);
                setEditingPermission(null);
            } catch (error) {
                toast({
                    title: editingPermission ? t('toast.updateErrorTitle') : t('toast.addErrorTitle'),
                    description: error instanceof Error ? error.message : t('toast.unexpectedError'),
                    variant: "destructive",
                });
            }
        });
    };

    const handleDeletePermission = () => {
        if (!permissionToDelete) return;

        startTransition(async () => {
            try {
                await deletePermission(permissionToDelete.id);
                setPermissions(prev => prev.filter(p => p.id !== permissionToDelete.id));
                toast({
                    title: t('toast.permissionDeletedTitle'),
                    description: t('toast.permissionDeletedDescription'),
                });
            } catch (error) {
                toast({
                    title: t('toast.deleteErrorTitle'),
                    description: error instanceof Error ? error.message : t('toast.unexpectedError'),
                    variant: "destructive",
                });
            } finally {
                setPermissionToDelete(null);
            }
        });
    };

    const permissionStatusOptions = [
      { value: "APROBADO POR SUPERVISOR", label: t('statusOptions.approvedBySupervisor')},
      { value: "APROBADO POR RRHH", label: t('statusOptions.approvedByHR') },
      { value: "NO APROBADO", label: t('statusOptions.notApproved') },
    ];

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <CardTitle>{t('cardTitle')}</CardTitle>
                            <CardDescription>
                                {t('cardDescription')}
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                             <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('searchPlaceholder')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 w-full sm:w-[200px]"
                                />
                            </div>
                            <Select value={activityFilter} onValueChange={(value: "all" | "active" | "inactive") => setActivityFilter(value)}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder={t('filterByActivityPlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('activityFilters.all')}</SelectItem>
                                    <SelectItem value="active">{t('activityFilters.active')}</SelectItem>
                                    <SelectItem value="inactive">{t('activityFilters.inactive')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={handleOpenAddDialog}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                {t('addPermissionButton')}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('tableHeaderEmployee')}</TableHead>
                                    <TableHead>{t('tableHeaderReason')}</TableHead>
                                    <TableHead>{t('tableHeaderFrom')}</TableHead>
                                    <TableHead>{t('tableHeaderTo')}</TableHead>
                                    <TableHead>{t('tableHeaderStatus')}</TableHead>
                                    <TableHead>{t('tableHeaderObservations')}</TableHead>
                                    <TableHead className="text-right">{t('tableHeaderActions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPermissions.length > 0 ? (
                                    filteredPermissions.map((perm) => (
                                        <TableRow key={perm.id}>
                                            <TableCell className="font-medium">{employeeMap.get(perm.employeeId) || t('employeeNotFound')}</TableCell>
                                            <TableCell>{absenceTypeMap.get(perm.absenceTypeId) || 'N/A'}</TableCell>
                                            <TableCell>{format(new Date(perm.startDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: dateLocale })}</TableCell>
                                            <TableCell>{format(new Date(perm.endDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: dateLocale })}</TableCell>
                                            <TableCell>
                                                <Badge variant={perm.status.startsWith('APROBADO') ? 'default' : 'destructive'}
                                                    className={perm.status.startsWith('APROBADO') ? 'bg-green-600' : ''}>
                                                    {permissionStatusOptions.find(p => p.value === perm.status)?.label || perm.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate" title={perm.observations}>{perm.observations}</TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenEditDialog(perm)}
                                                    disabled={isPending}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                    <span className="sr-only">{t('editSr', { employeeName: employeeMap.get(perm.employeeId) || "" })}</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => setPermissionToDelete(perm)}
                                                    disabled={isPending}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">{t('deleteSr', { employeeName: employeeMap.get(perm.employeeId) || "" })}</span>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            {permissions.length === 0 
                                                ? t('noPermissionsAdded') 
                                                : t('noPermissionsWithFilter')
                                            }
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingPermission(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingPermission ? t('editPermissionDialogTitle') : t('addPermissionDialogTitle')}</DialogTitle>
                        <DialogDescription>
                            {editingPermission ? t('editPermissionDialogDescription') : t('addPermissionDialogDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="employeeId">{t('employeeLabel')}</Label>
                            <Combobox
                                options={employeeOptions}
                                value={formState.employeeId}
                                onValueChange={(value) => handleInputChange('employeeId', value)}
                                placeholder={t('selectEmployeePlaceholder')}
                                searchPlaceholder={t('searchEmployeePlaceholder')}
                                emptyMessage={t('employeeNotFound')}
                                disabled={isPending}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="absenceTypeId">{t('absenceTypeLabel')}</Label>
                            <Select onValueChange={(value) => handleInputChange('absenceTypeId', value)} value={formState.absenceTypeId} disabled={isPending}>
                                <SelectTrigger><SelectValue placeholder={t('selectAbsenceTypePlaceholder')} /></SelectTrigger>
                                <SelectContent>
                                    {absenceTypeOptions.map(opt => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">{t('fromLabel')}</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formState.startDate ? format(formState.startDate, 'PPP', { locale: dateLocale }) : <span>{t('selectDatePlaceholder')}</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={formState.startDate} onSelect={(date) => handleInputChange('startDate', date)} initialFocus locale={dateLocale}/>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endDate">{t('toLabel')}</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formState.endDate ? format(formState.endDate, 'PPP', { locale: dateLocale }) : <span>{t('selectDatePlaceholder')}</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={formState.endDate} onSelect={(date) => handleInputChange('endDate', date)} initialFocus locale={dateLocale} />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">{t('statusLabel')}</Label>
                            <Select onValueChange={(value: PermissionStatus) => handleInputChange('status', value)} value={formState.status} disabled={isPending}>
                                <SelectTrigger><SelectValue placeholder={t('selectStatusPlaceholder')} /></SelectTrigger>
                                <SelectContent>
                                    {permissionStatusOptions.map(opt => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="observations">{t('observationsLabel')}</Label>
                            <Textarea
                                id="observations"
                                value={formState.observations}
                                onChange={(e) => handleInputChange('observations', e.target.value)}
                                placeholder={t('observationsPlaceholder')}
                                disabled={isPending}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>{t('cancelButton')}</Button></DialogClose>
                        <Button type="submit" onClick={handleSavePermission} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingPermission ? t('saveChangesButton') : t('savePermissionButton')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!permissionToDelete} onOpenChange={(open) => !open && setPermissionToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('deleteDialogTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('deleteDialogDescription', { 
                                employeeName: permissionToDelete ? employeeMap.get(permissionToDelete.employeeId) : '',
                                reason: permissionToDelete ? absenceTypeMap.get(permissionToDelete.absenceTypeId) : ''
                            })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPermissionToDelete(null)} disabled={isPending}>
                            {t('cancelButton')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeletePermission}
                            disabled={isPending}
                            className={buttonVariants({ variant: "destructive" })}
                        >
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('deleteDialogConfirmButton')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
