
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
import { Loader2, PlusCircle, Trash2, CalendarIcon as CalendarIconLucide, Search, Pencil } from "lucide-react";
import type { Employee, Obra, EmployeeCondition, EmployeeStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addEmployee, deleteEmployee, updateEmployee } from "@/app/actions";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";

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
        title: "Error de validación",
        description: "Debe completar todos los campos obligatorios (*).",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d+$/.test(legajo)) {
        toast({
            title: "Error de validación",
            description: "El legajo solo debe contener números.",
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
            title: "Empleado actualizado",
            description: `El empleado "${updatedEmployee.nombre} ${updatedEmployee.apellido}" ha sido actualizado.`,
           });
        } else {
            const newEmployee = await addEmployee(dataToSave);
            setEmployees((prev) => [...prev, newEmployee]);
            toast({
              title: "Empleado agregado",
              description: `El empleado "${newEmployee.nombre} ${newEmployee.apellido}" ha sido creado.`,
            });
        }
        setIsFormDialogOpen(false);
        setEditingEmployee(null);
      } catch (error) {
        toast({
          title: editingEmployee ? "Error al actualizar" : "Error al agregar",
          description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
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
          title: "Empleado eliminado",
          description: `El empleado ha sido eliminado con éxito.`,
        });
      } catch (error) {
        toast({
          title: "Error al eliminar",
          description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
          variant: "destructive",
        });
      } finally {
        setEmployeeToDelete(null);
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
             <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <CardTitle>Lista de Empleados</CardTitle>
                    <CardDescription>
                        Busque, edite o agregue nuevos empleados.
                    </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar empleado..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full sm:w-[250px]"
                        />
                    </div>
                    <Button onClick={handleOpenAddDialog}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Agregar Empleado
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Legajo</TableHead>
                            <TableHead>Apellido y Nombre</TableHead>
                            <TableHead>Obra</TableHead>
                            <TableHead>Condición</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right w-[120px]">Acciones</TableHead>
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
                                        <Badge variant={emp.condicion === 'mensual' ? 'secondary' : 'outline'}>{emp.condicion}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={emp.estado === 'activo' ? 'default' : emp.estado === 'baja' ? 'destructive' : 'secondary'}
                                        className={emp.estado === 'activo' ? 'bg-green-600' : ''}>
                                        {emp.estado}
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
                                            <span className="sr-only">Editar {emp.nombre}</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={() => setEmployeeToDelete(emp)}
                                            disabled={isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Eliminar {emp.nombre}</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                     {employees.length === 0 
                                        ? "No hay empleados creados." 
                                        : "No se encontraron empleados con los filtros aplicados."
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
            <DialogTitle>{editingEmployee ? 'Editar Empleado' : 'Agregar Nuevo Empleado'}</DialogTitle>
            <DialogDescription>
              {editingEmployee ? 'Modifique la información del empleado.' : 'Complete los campos obligatorios (*) para registrar un nuevo empleado.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-6">
            <div>
              <h3 className="mb-4 text-lg font-medium leading-none">Información Personal</h3>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="legajo" className="text-right">Legajo *</Label>
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
                  <Label htmlFor="cuil" className="text-right">CUIL</Label>
                  <Input id="cuil" value={formState.cuil} onChange={(e) => handleInputChange('cuil', e.target.value)} className="col-span-3" placeholder="Ej. 20-12345678-9" disabled={isPending}/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="apellido" className="text-right">Apellido *</Label>
                  <Input id="apellido" value={formState.apellido} onChange={(e) => handleInputChange('apellido', e.target.value)} className="col-span-3" placeholder="Pérez" disabled={isPending}/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nombre" className="text-right">Nombre *</Label>
                  <Input id="nombre" value={formState.nombre} onChange={(e) => handleInputChange('nombre', e.target.value)} className="col-span-3" placeholder="Juan" disabled={isPending}/>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-4 text-lg font-medium leading-none">Información Laboral</h3>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="fechaIngreso" className="text-right">F. Ingreso *</Label>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button variant="outline" className="col-span-3 justify-start text-left font-normal">
                              <CalendarIconLucide className="mr-2 h-4 w-4" />
                              {formState.fechaIngreso ? format(formState.fechaIngreso, 'PPP', { locale: es }) : <span>Seleccione fecha</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={formState.fechaIngreso} onSelect={(date) => handleInputChange('fechaIngreso', date)} initialFocus />
                      </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="obraId" className="text-right">Obra *</Label>
                   <Select onValueChange={(value) => handleInputChange('obraId', value)} value={formState.obraId} disabled={isPending}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccione una obra" /></SelectTrigger>
                    <SelectContent>{initialObras.map((obra) => <SelectItem key={obra.id} value={obra.id}>{obra.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="denominacionPosicion" className="text-right">Posición *</Label>
                  <Input id="denominacionPosicion" value={formState.denominacionPosicion} onChange={(e) => handleInputChange('denominacionPosicion', e.target.value)} className="col-span-3" placeholder="Ej. Oficial" disabled={isPending}/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="condicion" className="text-right">Condición *</Label>
                   <Select onValueChange={(value: EmployeeCondition) => handleInputChange('condicion', value)} value={formState.condicion} disabled={isPending}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccione condición" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jornal">Jornal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="estado" className="text-right">Estado *</Label>
                   <Select onValueChange={(value: EmployeeStatus) => handleInputChange('estado', value)} value={formState.estado} disabled={isPending}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccione estado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="suspendido">Suspendido</SelectItem>
                      <SelectItem value="baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div>
                <h3 className="mb-4 text-lg font-medium leading-none">Información de Contacto</h3>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="celular" className="text-right">Celular</Label>
                        <Input id="celular" value={formState.celular} onChange={(e) => handleInputChange('celular', e.target.value)} className="col-span-3" placeholder="Ej. 1122334455" disabled={isPending}/>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="correo" className="text-right">Correo</Label>
                        <Input id="correo" type="email" value={formState.correo} onChange={(e) => handleInputChange('correo', e.target.value)} className="col-span-3" placeholder="empleado@sacde.com" disabled={isPending}/>
                    </div>
                </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>Cancelar</Button></DialogClose>
            <Button type="submit" onClick={handleSaveEmployee} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingEmployee ? 'Guardar Cambios' : 'Guardar Empleado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente al empleado "{employeeToDelete?.nombre} {employeeToDelete?.apellido}".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setEmployeeToDelete(null)} disabled={isPending}>
                    Cancelar
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteEmployee} 
                  disabled={isPending}
                  className={buttonVariants({ variant: "destructive" })}
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, eliminar empleado"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    
