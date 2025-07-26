
"use client";

import { useState, useTransition, useMemo } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Loader2, PlusCircle, CalendarIcon, Search, Trash2, Pencil, FileSpreadsheet, CheckCircle } from "lucide-react";
import type { Permission, Employee, AbsenceType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import * as XLSX from 'xlsx';
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
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

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
    observations: "",
    designatedApproverJefeDeObraId: "",
    designatedApproverRecursosHumanosId: "",
};

export default function PermissionsManager({ initialPermissions, initialEmployees, initialAbsenceTypes }: PermissionsManagerProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const isMobile = useIsMobile();
    const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formState, setFormState] = useState(emptyForm);
    const [searchTerm, setSearchTerm] = useState("");
    const [activityFilter, setActivityFilter] = useState<"all" | "active" | "inactive">("all");
    const [permissionToDelete, setPermissionToDelete] = useState<Permission | null>(null);
    const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
    const [isPending, startTransition] = useTransition();

    const canManage = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('permissions.manage'), [user]);
    const canApproveSupervisor = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('permissions.approveSupervisor'), [user]);
    const canApproveHR = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('permissions.approveHR'), [user]);

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
            ...emptyForm,
            ...permission,
            startDate: new Date(permission.startDate + 'T00:00:00'),
            endDate: new Date(permission.endDate + 'T00:00:00'),
            observations: permission.observations || '',
            designatedApproverJefeDeObraId: permission.designatedApproverJefeDeObraId || '',
            designatedApproverRecursosHumanosId: permission.designatedApproverRecursosHumanosId || '',
        });
        setIsFormOpen(true);
    };

    const handleApprove = (permission: Permission, approverType: 'supervisor' | 'hr') => {
        if (!user) return;

        startTransition(async () => {
            try {
                const docRef = doc(db, 'permissions', permission.id);
                let updateData: Partial<Permission> = {};
                const approvalTime = new Date().toISOString();
                
                if (approverType === 'supervisor') {
                    updateData.approvedByJefeDeObraId = user.id;
                    updateData.approvedByJefeDeObraAt = approvalTime;
                } else {
                    updateData.approvedByRecursosHumanosId = user.id;
                    updateData.approvedByRecursosHumanosAt = approvalTime;
                }

                await updateDoc(docRef, updateData);

                const updatedPermission = { ...permission, ...updateData };
                setPermissions(prev => prev.map(p => p.id === updatedPermission.id ? updatedPermission : p));
                toast({
                    title: "Ausentismo Aprobado",
                    description: `El ausentismo para ${employeeMap.get(permission.employeeId)} ha sido aprobado.`,
                });
            } catch (error) {
                toast({
                    title: "Error al Aprobar",
                    description: "No se pudo completar la aprobación.",
                    variant: "destructive"
                });
            }
        });
    };

    const handleSavePermission = () => {
        const { employeeId, startDate, endDate, absenceTypeId, designatedApproverJefeDeObraId, designatedApproverRecursosHumanosId } = formState;
        if (!employeeId || !startDate || !endDate || !absenceTypeId || !designatedApproverJefeDeObraId || !designatedApproverRecursosHumanosId) {
            toast({
                title: "Error de validación",
                description: "Debe completar todos los campos obligatorios (*).",
                variant: "destructive",
            });
            return;
        }

        if (endDate < startDate) {
            toast({
                title: "Error de validación",
                description: "La fecha 'Hasta' no puede ser anterior a la fecha 'Desde'.",
                variant: "destructive",
            });
            return;
        }

        const newStartDate = startOfDay(startDate);
        const newEndDate = endOfDay(endDate);

        const overlaps = permissions.some(perm => {
            if (perm.employeeId !== employeeId) return false;
            if (editingPermission && perm.id === editingPermission.id) return false;

            const existingStartDate = startOfDay(new Date(perm.startDate + 'T00:00:00'));
            const existingEndDate = endOfDay(new Date(perm.endDate + 'T00:00:00'));

            return isWithinInterval(newStartDate, { start: existingStartDate, end: existingEndDate }) ||
                   isWithinInterval(newEndDate, { start: existingStartDate, end: existingEndDate }) ||
                   isWithinInterval(existingStartDate, { start: newStartDate, end: newEndDate }) ||
                   isWithinInterval(existingEndDate, { start: newStartDate, end: newEndDate });
        });

        if (overlaps) {
            toast({
                title: "Error de Fechas",
                description: "El rango de fechas para este empleado se superpone con un ausentismo existente.",
                variant: "destructive",
            });
            return;
        }
        
        startTransition(async () => {
            try {
                const permissionData = {
                    employeeId,
                    absenceTypeId,
                    startDate: format(startDate, "yyyy-MM-dd"),
                    endDate: format(endDate, "yyyy-MM-dd"),
                    observations: formState.observations || '',
                    designatedApproverJefeDeObraId: formState.designatedApproverJefeDeObraId || '',
                    designatedApproverRecursosHumanosId: formState.designatedApproverRecursosHumanosId || '',
                };

                if (editingPermission) {
                    const docRef = doc(db, 'permissions', editingPermission.id);
                    await updateDoc(docRef, permissionData);
                    const updatedPermission = {
                        ...editingPermission,
                        ...permissionData,
                    } as Permission;
                    setPermissions(prev => prev.map(p => p.id === updatedPermission.id ? updatedPermission : p));
                    toast({ title: "Ausentismo actualizado" });
                } else {
                     const dataToSave: Omit<Permission, 'id'> = {
                        ...permissionData,
                        approvedByJefeDeObraId: '',
                        approvedByJefeDeObraAt: '',
                        approvedByRecursosHumanosId: '',
                        approvedByRecursosHumanosAt: '',
                    };
                    const docRef = await addDoc(collection(db, 'permissions'), dataToSave);
                    const newPermission = { id: docRef.id, ...dataToSave } as Permission;
                    setPermissions(prev => [...prev, newPermission]);
                    toast({ title: "Ausentismo cargado" });
                }
                setIsFormOpen(false);
                setEditingPermission(null);
            } catch (error) {
                toast({
                    title: editingPermission ? "Error al actualizar ausentismo" : "Error al cargar ausentismo",
                    description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
                    variant: "destructive",
                });
            }
        });
    };

    const handleDeletePermission = () => {
        if (!permissionToDelete) return;

        startTransition(async () => {
            try {
                await deleteDoc(doc(db, 'permissions', permissionToDelete.id));
                setPermissions(prev => prev.filter(p => p.id !== permissionToDelete.id));
                toast({
                    title: "Ausentismo eliminado",
                    description: "El ausentismo ha sido eliminado con éxito.",
                });
            } catch (error) {
                toast({
                    title: "Error al eliminar",
                    description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
                    variant: "destructive",
                });
            } finally {
                setPermissionToDelete(null);
            }
        });
    };
    
    const handleExport = () => {
        startTransition(() => {
            try {
                const dataToExport = filteredPermissions.map(perm => ({
                    "Empleado": employeeMap.get(perm.employeeId) || 'N/A',
                    "Motivo": absenceTypeMap.get(perm.absenceTypeId) || 'N/A',
                    "Desde": format(new Date(perm.startDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: es }),
                    "Hasta": format(new Date(perm.endDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: es }),
                    "Aprobado por Jefe de Obra": perm.approvedByJefeDeObraId ? (employeeMap.get(perm.approvedByJefeDeObraId) || 'Aprobado') : 'No',
                    "Aprobado por RRHH": perm.approvedByRecursosHumanosId ? (employeeMap.get(perm.approvedByRecursosHumanosId) || 'Aprobado') : 'No',
                    "Observaciones": perm.observations || ''
                }));
    
                const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Ausentismos");
                
                const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
                    wch: Math.max(
                        key.length,
                        ...dataToExport.map(row => (row[key as keyof typeof row] ? String(row[key as keyof typeof row]).length : 0))
                    ) + 2
                }));
                worksheet['!cols'] = colWidths;
                
                XLSX.writeFile(workbook, `Listado_Ausentismos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
                toast({
                    title: "Exportación exitosa",
                    description: "El listado de ausentismos se ha descargado.",
                });
            } catch (error) {
                toast({
                    title: "Error al exportar",
                    description: "No se pudo generar el archivo Excel.",
                    variant: "destructive"
                });
            }
        });
      };
      
    const renderApprovalStatus = (permission: Permission, approverType: 'supervisor' | 'hr') => {
        const canApprove = approverType === 'supervisor' ? canApproveSupervisor : canApproveHR;
        const approvedById = approverType === 'supervisor' ? permission.approvedByJefeDeObraId : permission.approvedByRecursosHumanosId;
        const approvedAt = approverType === 'supervisor' ? permission.approvedByJefeDeObraAt : permission.approvedByRecursosHumanosAt;
        const designatedId = approverType === 'supervisor' ? permission.designatedApproverJefeDeObraId : permission.designatedApproverRecursosHumanosId;
        const showApproveButton = canApprove && !approvedById && (!designatedId || designatedId === user?.id);

        if (approvedById) {
            return (
                <Tooltip>
                    <TooltipTrigger>
                        <Badge variant="secondary" className={approverType === 'supervisor' ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            {employeeMap.get(approvedById) || 'Aprobado'}
                        </Badge>
                    </TooltipTrigger>
                    {approvedAt && (
                        <TooltipContent>
                            <p>Aprobado el: {format(new Date(approvedAt), 'Pp', { locale: es })}</p>
                        </TooltipContent>
                    )}
                </Tooltip>
            );
        }

        if (showApproveButton) {
            return (
                <Button size="sm" variant="outline" onClick={() => handleApprove(permission, approverType)} disabled={isPending}>Aprobar</Button>
            );
        }

        return (
            <Tooltip>
                <TooltipTrigger>
                    <Badge variant="destructive">Pendiente</Badge>
                </TooltipTrigger>
                {designatedId && (
                    <TooltipContent>
                        <p>Responsable: {employeeMap.get(designatedId)}</p>
                    </TooltipContent>
                )}
            </Tooltip>
        );
    };

    const MobilePermissionCard = ({ perm }: { perm: Permission }) => (
        <Card>
            <CardHeader>
                <CardTitle>{employeeMap.get(perm.employeeId) || "Empleado no encontrado"}</CardTitle>
                <CardDescription>{absenceTypeMap.get(perm.absenceTypeId) || 'N/A'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div>
                    <strong>Período:</strong>
                    <p>{format(new Date(perm.startDate + 'T00:00:00'), 'dd/MM/yyyy')} - {format(new Date(perm.endDate + 'T00:00:00'), 'dd/MM/yyyy')}</p>
                </div>
                <div className="flex justify-between items-center">
                    <strong>Jefe Obra:</strong>
                    {renderApprovalStatus(perm, 'supervisor')}
                </div>
                <div className="flex justify-between items-center">
                    <strong>RRHH:</strong>
                    {renderApprovalStatus(perm, 'hr')}
                </div>
                {perm.observations && (
                    <div>
                        <strong>Observaciones:</strong>
                        <p className="text-muted-foreground">{perm.observations}</p>
                    </div>
                )}
            </CardContent>
            {canManage && (
                <CardFooter className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(perm)} disabled={isPending}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setPermissionToDelete(perm)} disabled={isPending}>
                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </Button>
                </CardFooter>
            )}
        </Card>
    );

    return (
        <>
        <TooltipProvider>
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle>Listado de Ausentismos</CardTitle>
                            <CardDescription>
                                Filtre, vea y gestione los ausentismos para los empleados.
                            </CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                             <div className="relative w-full sm:w-auto">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por empleado..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 w-full sm:w-[200px]"
                                />
                            </div>
                            <Select value={activityFilter} onValueChange={(value: "all" | "active" | "inactive") => setActivityFilter(value)}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Filtrar por actividad" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="active">Activos</SelectItem>
                                    <SelectItem value="inactive">Inactivos</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={handleExport} variant="outline" disabled={isPending} className="w-full sm:w-auto">
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                Exportar
                            </Button>
                            {canManage && (
                                <Button onClick={handleOpenAddDialog} className="w-full sm:w-auto">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Cargar
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isMobile ? (
                        <div className="space-y-4">
                            {filteredPermissions.length > 0 ? (
                                filteredPermissions.map(perm => <MobilePermissionCard key={perm.id} perm={perm} />)
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    {permissions.length === 0 
                                        ? "No hay ausentismos cargados."
                                        : "No se encontraron ausentismos con los filtros aplicados."
                                    }
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Empleado</TableHead>
                                        <TableHead>Motivo</TableHead>
                                        <TableHead>Desde</TableHead>
                                        <TableHead>Hasta</TableHead>
                                        <TableHead>Aprobado por Jefe de Obra</TableHead>
                                        <TableHead>Aprobado por RRHH</TableHead>
                                        <TableHead>Observaciones</TableHead>
                                        {canManage && <TableHead className="text-right">Acciones</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPermissions.length > 0 ? (
                                        filteredPermissions.map((perm) => (
                                            <TableRow key={perm.id}>
                                                <TableCell className="font-medium">{employeeMap.get(perm.employeeId) || "Empleado no encontrado"}</TableCell>
                                                <TableCell>{absenceTypeMap.get(perm.absenceTypeId) || 'N/A'}</TableCell>
                                                <TableCell>{format(new Date(perm.startDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })}</TableCell>
                                                <TableCell>{format(new Date(perm.endDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })}</TableCell>
                                                <TableCell>{renderApprovalStatus(perm, 'supervisor')}</TableCell>
                                                <TableCell>{renderApprovalStatus(perm, 'hr')}</TableCell>
                                                <TableCell className="max-w-xs truncate" title={perm.observations}>{perm.observations}</TableCell>
                                                {canManage && (
                                                    <TableCell className="text-right space-x-1">
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(perm)} disabled={isPending} >
                                                            <Pencil className="h-4 w-4" />
                                                            <span className="sr-only">Editar ausentismo</span>
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setPermissionToDelete(perm)} disabled={isPending} >
                                                            <Trash2 className="h-4 w-4" />
                                                            <span className="sr-only">Eliminar ausentismo</span>
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={canManage ? 8 : 7} className="h-24 text-center">
                                                {permissions.length === 0 
                                                    ? "No hay ausentismos cargados."
                                                    : "No se encontraron ausentismos con los filtros aplicados."
                                                }
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>

            <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingPermission(null); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingPermission ? "Editar Ausentismo" : "Cargar Nuevo Ausentismo"}</DialogTitle>
                        <DialogDescription>
                            {editingPermission ? "Modifique los detalles del ausentismo." : "Complete la información para registrar un nuevo ausentismo."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <div className="space-y-2">
                            <Label htmlFor="employeeId">Empleado *</Label>
                            <Combobox
                                options={employeeOptions}
                                value={formState.employeeId}
                                onValueChange={(value) => handleInputChange('employeeId', value)}
                                placeholder="Seleccione un empleado"
                                searchPlaceholder="Buscar por nombre, legajo..."
                                emptyMessage="Empleado no encontrado"
                                disabled={isPending || !canManage}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="absenceTypeId">Motivo de Ausencia *</Label>
                            <Select onValueChange={(value) => handleInputChange('absenceTypeId', value)} value={formState.absenceTypeId} disabled={isPending || !canManage}>
                                <SelectTrigger><SelectValue placeholder="Seleccione un motivo" /></SelectTrigger>
                                <SelectContent>
                                    {absenceTypeOptions.map(opt => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Desde *</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isPending || !canManage}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formState.startDate ? format(formState.startDate, 'PPP', { locale: es }) : <span>Seleccione fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={formState.startDate} onSelect={(date) => handleInputChange('startDate', date)} initialFocus locale={es}/>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endDate">Hasta *</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isPending || !canManage}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formState.endDate ? format(formState.endDate, 'PPP', { locale: es }) : <span>Seleccione fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={formState.endDate} onSelect={(date) => handleInputChange('endDate', date)} initialFocus locale={es} />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="designatedApproverJefeDeObraId">Responsable Aprobación (Jefe de Obra) *</Label>
                            <Combobox
                                options={employeeOptions}
                                value={formState.designatedApproverJefeDeObraId}
                                onValueChange={(value) => handleInputChange('designatedApproverJefeDeObraId', value)}
                                placeholder="Seleccionar un aprobador"
                                searchPlaceholder="Buscar aprobador..."
                                emptyMessage="Empleado no encontrado"
                                disabled={isPending || !canManage}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="designatedApproverRecursosHumanosId">Responsable Aprobación (RRHH) *</Label>
                            <Combobox
                                options={employeeOptions}
                                value={formState.designatedApproverRecursosHumanosId}
                                onValueChange={(value) => handleInputChange('designatedApproverRecursosHumanosId', value)}
                                placeholder="Seleccionar un aprobador"
                                searchPlaceholder="Buscar aprobador..."
                                emptyMessage="Empleado no encontrado"
                                disabled={isPending || !canManage}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="observations">Observaciones</Label>
                            <Textarea
                                id="observations"
                                value={formState.observations}
                                onChange={(e) => handleInputChange('observations', e.target.value)}
                                placeholder="Añadir observaciones..."
                                disabled={isPending || !canManage}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>Cancelar</Button></DialogClose>
                        {canManage && (
                            <Button type="submit" onClick={handleSavePermission} disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingPermission ? "Guardar Cambios" : "Guardar Ausentismo"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!permissionToDelete} onOpenChange={(open) => !open && setPermissionToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el ausentismo para "{permissionToDelete ? employeeMap.get(permissionToDelete.employeeId) : ''}" por el motivo "{permissionToDelete ? absenceTypeMap.get(permissionToDelete.absenceTypeId) : ''}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPermissionToDelete(null)} disabled={isPending}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeletePermission}
                            disabled={isPending}
                            className={buttonVariants({ variant: "destructive" })}
                        >
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, eliminar ausentismo"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
