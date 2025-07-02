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
import { Loader2, PlusCircle, Trash2, CalendarIcon as CalendarIconLucide } from "lucide-react";
import type { Employee, Obra, EmployeeCondition, EmployeeStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addEmployee, deleteEmployee } from "@/app/actions";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const [formState, setFormState] = useState(emptyForm);

  const [isPending, startTransition] = useTransition();

  const obraNameMap = useMemo(() => {
    return Object.fromEntries(initialObras.map(obra => [obra.id, obra.name]));
  }, [initialObras]);

  const handleInputChange = (field: keyof typeof emptyForm, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleAddEmployee = () => {
    const { fechaIngreso, ...rest } = formState;
    const allFieldsFilled = Object.values(rest).every(field => field !== "" && field !== null && field !== undefined) && fechaIngreso;

    if (!allFieldsFilled) {
      toast({
        title: "Error de validación",
        description: "Debe completar todos los campos para crear un empleado.",
        variant: "destructive",
      });
      return;
    }
    
    const newEmployeeData = {
        ...formState,
        fechaIngreso: format(fechaIngreso!, "yyyy-MM-dd"),
        condicion: formState.condicion as EmployeeCondition,
        estado: formState.estado as EmployeeStatus
    };

    startTransition(async () => {
      try {
        const newEmployee = await addEmployee(newEmployeeData);
        setEmployees((prev) => [...prev, newEmployee]);
        setFormState(emptyForm);
        setIsAddDialogOpen(false);
        toast({
          title: "Empleado agregado",
          description: `El empleado "${newEmployee.nombre} ${newEmployee.apellido}" ha sido creado.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo agregar el empleado.",
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
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Lista de Empleados</CardTitle>
                <CardDescription>
                    Aquí puede ver y gestionar todos los empleados.
                </CardDescription>
            </div>
            <Button onClick={() => { setFormState(emptyForm); setIsAddDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Empleado
            </Button>
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
                            <TableHead className="text-right w-[100px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {employees.length > 0 ? (
                            employees.map((emp) => (
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
                                    <TableCell className="text-right">
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
                                    No hay empleados creados.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Empleado</DialogTitle>
            <DialogDescription>
              Complete todos los campos para registrar un nuevo empleado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="legajo" className="text-right">Legajo</Label>
                <Input id="legajo" value={formState.legajo} onChange={(e) => handleInputChange('legajo', e.target.value)} className="col-span-3" placeholder="Ej. 12345" disabled={isPending}/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cuil" className="text-right">CUIL</Label>
                <Input id="cuil" value={formState.cuil} onChange={(e) => handleInputChange('cuil', e.target.value)} className="col-span-3" placeholder="Ej. 20-12345678-9" disabled={isPending}/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="apellido" className="text-right">Apellido</Label>
                <Input id="apellido" value={formState.apellido} onChange={(e) => handleInputChange('apellido', e.target.value)} className="col-span-3" placeholder="Pérez" disabled={isPending}/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nombre" className="text-right">Nombre</Label>
                <Input id="nombre" value={formState.nombre} onChange={(e) => handleInputChange('nombre', e.target.value)} className="col-span-3" placeholder="Juan" disabled={isPending}/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fechaIngreso" className="text-right">F. Ingreso</Label>
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
                <Label htmlFor="obraId" className="text-right">Obra</Label>
                 <Select onValueChange={(value) => handleInputChange('obraId', value)} value={formState.obraId} disabled={isPending}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccione una obra" /></SelectTrigger>
                  <SelectContent>{initialObras.map((obra) => <SelectItem key={obra.id} value={obra.id}>{obra.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="denominacionPosicion" className="text-right">Posición</Label>
                <Input id="denominacionPosicion" value={formState.denominacionPosicion} onChange={(e) => handleInputChange('denominacionPosicion', e.target.value)} className="col-span-3" placeholder="Ej. Oficial" disabled={isPending}/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="condicion" className="text-right">Condición</Label>
                 <Select onValueChange={(value: EmployeeCondition) => handleInputChange('condicion', value)} value={formState.condicion} disabled={isPending}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccione condición" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jornal">Jornal</SelectItem>
                    <SelectItem value="mensual">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="estado" className="text-right">Estado</Label>
                 <Select onValueChange={(value: EmployeeStatus) => handleInputChange('estado', value)} value={formState.estado} disabled={isPending}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccione estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="suspendido">Suspendido</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="celular" className="text-right">Celular</Label>
                <Input id="celular" value={formState.celular} onChange={(e) => handleInputChange('celular', e.target.value)} className="col-span-3" placeholder="Ej. 1122334455" disabled={isPending}/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4 md:col-span-2">
                <Label htmlFor="correo" className="text-right md:col-span-1">Correo</Label>
                <Input id="correo" type="email" value={formState.correo} onChange={(e) => handleInputChange('correo', e.target.value)} className="col-span-3" placeholder="empleado@sacde.com" disabled={isPending}/>
              </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>Cancelar</Button></DialogClose>
            <Button type="submit" onClick={handleAddEmployee} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Empleado
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
