
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
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Trash2, CalendarIcon as CalendarIconLucide, Search, Pencil, FileSpreadsheet } from "lucide-react";
import type { Employee, Obra, EmployeeCondition, EmployeeStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addEmployee, deleteEmployee, updateEmployee } from "@/app/actions";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import * as XLSX from 'xlsx';

interface EmployeesManagerProps {
  initialEmployees: Employee[];
  initialObras: Obra[];
}

const emptyForm = {
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
}

export default function EmployeesManager({ initialEmployees, initialObras }: EmployeesManagerProps) {
  const t = useTranslations('EmployeesManager');
  const locale = useLocale();
  const dateLocale = locale === 'es' ? es : enUS;

  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formState, setFormState] = useState(emptyForm);

  const [isPending, startTransition] = useTransition();

  const obraNameMap = useMemo(() => {
    return Object.fromEntries(initialObras.map(obra => [obra.id, obra.name]));
  }, [initialObras]);

  const filteredEmployees = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
    if (!lowerCaseSearchTerm) {
        return employees;
    }

    return employees.filter((emp) => {
        const fullName = `${emp.nombre} ${emp.apellido}`.toLowerCase();
        const legajo = emp.legajo.toLowerCase();
        const cuil = emp.cuil ? emp.cuil.toLowerCase() : '';

        return (
            fullName.includes(lowerCaseSearchTerm) ||
            legajo.includes(lowerCaseSearchTerm) ||
            (cuil && cuil.includes(lowerCaseSearchTerm)) ||
            emp.apellido.toLowerCase().includes(lowerCaseSearchTerm) ||
            emp.nombre.toLowerCase().includes(lowerCaseSearchTerm)
        );
    });
  }, [employees, searchTerm]);

  const handleInputChange = (field: keyof typeof emptyForm, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };
  
  const handleOpenAddDialog = () => {
    setEditingEmployee(null);
    setFormState(emptyForm);
    setIsFormDialogOpen(true);
  };

  const handleOpenEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormState({
        ...employee,
        cuil: employee.cuil || '',
        celular: employee.celular || '',
        correo: employee.correo || '',
        fechaIngreso: employee.fechaIngreso ? new Date(employee.fechaIngreso + 'T00:00:00') : undefined,
    });
    setIsFormDialogOpen(true);
  };

  const handleSaveEmployee = () => {
    const { legajo, apellido, nombre, obraId, denominacionPosicion, condicion, estado, fechaIngreso } = formState;

    const requiredFields: (keyof typeof formState)[] = ['legajo', 'apellido', 'nombre', 'obraId', 'denominacionPosicion', 'condicion', 'estado'];
    const missingField = requiredFields.some(field => !formState[field]);

    if (missingField || !fechaIngreso) {
      toast({
        title: t('toast.validationErrorTitle'),
        description: t('toast.validationErrorDescription'),
        variant: "destructive",
      });
      return;
    }

    if (!/^\d+$/.test(legajo)) {
        toast({
            title: t('toast.validationErrorTitle'),
            description: t('toast.legajoValidationError'),
            variant: "destructive",
        });
        return;
    }
    
    const employeeData = {
        ...formState,
        fechaIngreso: format(fechaIngreso, "yyyy-MM-dd"),
        condicion: formState.condicion as EmployeeCondition,
        estado: formState.estado as EmployeeStatus,
    };
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...dataToSave } = employeeData;

    startTransition(async () => {
      try {
        if (editingEmployee) {
           const updatedEmployee = await updateEmployee(editingEmployee.id, dataToSave);
           setEmployees(prev => prev.map(e => e.id === updatedEmployee.id ? updatedEmployee : e));
           toast({
            title: t('toast.employeeUpdatedTitle'),
            description: t('toast.employeeUpdatedDescription', { name: `${updatedEmployee.nombre} ${updatedEmployee.apellido}` }),
           });
        } else {
            const newEmployee = await addEmployee(dataToSave);
            setEmployees((prev) => [...prev, newEmployee]);
            toast({
              title: t('toast.employeeAddedTitle'),
              description: t('toast.employeeAddedDescription', { name: `${newEmployee.nombre} ${newEmployee.apellido}` }),
            });
        }
        setIsFormDialogOpen(false);
        setEditingEmployee(null);
      } catch (error) {
        toast({
          title: editingEmployee ? t('toast.updateErrorTitle') : t('toast.addErrorTitle'),
          description: error instanceof Error ? error.message : t('toast.unexpectedError'),
          variant: "destructive",
        });
      }
    });
  };
  
  const handleDeleteEmployee = () => {
    if (!employeeToDelete) return;

    startTransition(async () => {
      try {
        await deleteEmployee(employeeToDelete.id);
        setEmployees((prev) => prev.filter((e) => e.id !== employeeToDelete.id));
        toast({
          title: t('toast.employeeDeletedTitle'),
          description: t('toast.employeeDeletedDescription'),
        });
      } catch (error) {
        toast({
          title: t('toast.deleteErrorTitle'),
          description: error instanceof Error ? error.message : t('toast.unexpectedError'),
          variant: "destructive",
        });
      } finally {
        setEmployeeToDelete(null);
      }
    });
  };

  const handleExport = () => {
    startTransition(() => {
        try {
            const dataToExport = employees.map(emp => ({
                [t('exportHeaders.legajo')]: emp.legajo,
                [t('exportHeaders.apellido')]: emp.apellido,
                [t('exportHeaders.nombre')]: emp.nombre,
                [t('exportHeaders.cuil')]: emp.cuil || '',
                [t('exportHeaders.fechaIngreso')]: emp.fechaIngreso ? format(new Date(emp.fechaIngreso + 'T00:00:00'), 'dd/MM/yyyy', { locale: dateLocale }) : '',
                [t('exportHeaders.obra')]: obraNameMap[emp.obraId] || 'N/A',
                [t('exportHeaders.posicion')]: emp.denominacionPosicion,
                [t('exportHeaders.condicion')]: emp.condicion,
                [t('exportHeaders.estado')]: emp.estado,
                [t('exportHeaders.celular')]: emp.celular || '',
                [t('exportHeaders.correo')]: emp.correo || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, t('exportSheetName'));
            
            const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
                wch: Math.max(
                    key.length,
                    ...dataToExport.map(row => (row[key as keyof typeof row] ? String(row[key as keyof typeof row]).length : 0))
                ) + 2
            }));
            worksheet['!cols'] = colWidths;
            
            XLSX.writeFile(workbook, `${t('exportFileName')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

            toast({
                title: t('toast.exportSuccessTitle'),
                description: t('toast.exportSuccessDescription'),
            });
        } catch (error) {
            toast({
                title: t('toast.exportErrorTitle'),
                description: t('toast.exportErrorDescription'),
                variant: "destructive"
            });
        }
    });
  };

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
                            className="pl-10 w-full sm:w-[250px]"
                        />
                    </div>
                    <Button onClick={handleExport} variant="outline" disabled={isPending}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        {t('exportButton')}
                    </Button>
                    <Button onClick={handleOpenAddDialog}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('addEmployeeButton')}
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('tableHeaderLegajo')}</TableHead>
                            <TableHead>{t('tableHeaderName')}</TableHead>
                            <TableHead>{t('tableHeaderProject')}</TableHead>
                            <TableHead>{t('tableHeaderCondition')}</TableHead>
                            <TableHead>{t('tableHeaderStatus')}</TableHead>
                            <TableHead className="text-right w-[120px]">{t('tableHeaderActions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredEmployees.length > 0 ? (
                            filteredEmployees.map((emp) => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-mono">{emp.legajo}</TableCell>
                                    <TableCell className="font-medium">{`${emp.apellido}, ${emp.nombre}`}</TableCell>
                                    <TableCell>{obraNameMap[emp.obraId] || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant={emp.condicion === 'mensual' ? 'secondary' : 'outline'}>{t(`conditions.${emp.condicion}`)}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={emp.estado === 'activo' ? 'default' : emp.estado === 'baja' ? 'destructive' : 'secondary'}
                                        className={emp.estado === 'activo' ? 'bg-green-600' : ''}>
                                        {t(`statuses.${emp.estado}`)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleOpenEditDialog(emp)}
                                            disabled={isPending}
                                        >
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">{t('editSr', { name: emp.nombre })}</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={() => setEmployeeToDelete(emp)}
                                            disabled={isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">{t('deleteSr', { name: emp.nombre })}</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                     {employees.length === 0 
                                        ? t('noEmployeesCreated') 
                                        : t('noEmployeesWithFilter')
                                    }
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      
      <Dialog open={isFormDialogOpen} onOpenChange={(open) => { setIsFormDialogOpen(open); if (!open) setEditingEmployee(null); }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? t('editEmployeeDialogTitle') : t('addEmployeeDialogTitle')}</DialogTitle>
            <DialogDescription>
              {editingEmployee ? t('editEmployeeDialogDescription') : t('addEmployeeDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-6">
            <div>
              <h3 className="mb-4 text-lg font-medium leading-none">{t('personalInfoTitle')}</h3>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="legajo" className="text-right">{t('legajoLabel')} *</Label>
                  <Input 
                    id="legajo" 
                    value={formState.legajo} 
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*$/.test(value)) {
                        handleInputChange('legajo', value);
                      }
                    }} 
                    className="col-span-3" 
                    placeholder="Ej. 12345" 
                    disabled={isPending || !!editingEmployee}
                    pattern="[0-9]*"
                    inputMode="numeric"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cuil" className="text-right">{t('cuilLabel')}</Label>
                  <Input id="cuil" value={formState.cuil} onChange={(e) => handleInputChange('cuil', e.target.value)} className="col-span-3" placeholder="Ej. 20-12345678-9" disabled={isPending}/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="apellido" className="text-right">{t('lastNameLabel')} *</Label>
                  <Input id="apellido" value={formState.apellido} onChange={(e) => handleInputChange('apellido', e.target.value)} className="col-span-3" placeholder="Pérez" disabled={isPending}/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nombre" className="text-right">{t('firstNameLabel')} *</Label>
                  <Input id="nombre" value={formState.nombre} onChange={(e) => handleInputChange('nombre', e.target.value)} className="col-span-3" placeholder="Juan" disabled={isPending}/>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-4 text-lg font-medium leading-none">{t('workInfoTitle')}</h3>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="fechaIngreso" className="text-right">{t('hireDateLabel')} *</Label>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button variant="outline" className="col-span-3 justify-start text-left font-normal">
                              <CalendarIconLucide className="mr-2 h-4 w-4" />
                              {formState.fechaIngreso ? format(formState.fechaIngreso, 'PPP', { locale: dateLocale }) : <span>{t('selectDatePlaceholder')}</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={formState.fechaIngreso} onSelect={(date) => handleInputChange('fechaIngreso', date)} initialFocus locale={dateLocale} />
                      </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="obraId" className="text-right">{t('projectLabel')} *</Label>
                   <Select onValueChange={(value) => handleInputChange('obraId', value)} value={formState.obraId} disabled={isPending}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder={t('selectProjectPlaceholder')} /></SelectTrigger>
                    <SelectContent>{initialObras.map((obra) => <SelectItem key={obra.id} value={obra.id}>{obra.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="denominacionPosicion" className="text-right">{t('positionLabel')} *</Label>
                  <Input id="denominacionPosicion" value={formState.denominacionPosicion} onChange={(e) => handleInputChange('denominacionPosicion', e.target.value)} className="col-span-3" placeholder={t('positionPlaceholder')} disabled={isPending}/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="condicion" className="text-right">{t('conditionLabel')} *</Label>
                   <Select onValueChange={(value: EmployeeCondition) => handleInputChange('condicion', value)} value={formState.condicion} disabled={isPending}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder={t('selectConditionPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jornal">{t('conditions.jornal')}</SelectItem>
                      <SelectItem value="mensual">{t('conditions.mensual')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="estado" className="text-right">{t('statusLabel')} *</Label>
                   <Select onValueChange={(value: EmployeeStatus) => handleInputChange('estado', value)} value={formState.estado} disabled={isPending}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder={t('selectStatusPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">{t('statuses.activo')}</SelectItem>
                      <SelectItem value="suspendido">{t('statuses.suspendido')}</SelectItem>
                      <SelectItem value="baja">{t('statuses.baja')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div>
                <h3 className="mb-4 text-lg font-medium leading-none">{t('contactInfoTitle')}</h3>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="celular" className="text-right">{t('cellPhoneLabel')}</Label>
                        <Input id="celular" value={formState.celular} onChange={(e) => handleInputChange('celular', e.target.value)} className="col-span-3" placeholder="Ej. 1122334455" disabled={isPending}/>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="correo" className="text-right">{t('emailLabel')}</Label>
                        <Input id="correo" type="email" value={formState.correo} onChange={(e) => handleInputChange('correo', e.target.value)} className="col-span-3" placeholder="empleado@sacde.com" disabled={isPending}/>
                    </div>
                </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>{t('cancelButton')}</Button></DialogClose>
            <Button type="submit" onClick={handleSaveEmployee} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingEmployee ? t('saveChangesButton') : t('saveEmployeeButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteDialogTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('deleteDialogDescription', { name: `${employeeToDelete?.nombre} ${employeeToDelete?.apellido}` })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setEmployeeToDelete(null)} disabled={isPending}>
                    {t('cancelButton')}
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteEmployee} 
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
