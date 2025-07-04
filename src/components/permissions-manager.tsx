
"use client";

import { useState, useTransition, useMemo } from "react";
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
import { Loader2, PlusCircle, CalendarIcon } from "lucide-react";
import type { Permission, Employee, PermissionStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addPermission } from "@/app/actions";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PermissionsManagerProps {
  initialPermissions: Permission[];
  initialEmployees: Employee[];
}

const emptyForm = {
    employeeId: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    status: "" as PermissionStatus | "",
    observations: "",
};

export default function PermissionsManager({ initialPermissions, initialEmployees }: PermissionsManagerProps) {
    const { toast } = useToast();
    const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formState, setFormState] = useState(emptyForm);
    const [isPending, startTransition] = useTransition();

    const employeeMap = useMemo(() => {
        return new Map(initialEmployees.map(emp => [emp.id, `${emp.nombre} ${emp.apellido} (L: ${emp.legajo})`]));
    }, [initialEmployees]);

    const employeeOptions = useMemo(() => {
        return initialEmployees.map(emp => ({
            value: emp.id,
            label: `${emp.nombre} ${emp.apellido} (L: ${emp.legajo})`
        }));
    }, [initialEmployees]);

    const handleInputChange = (field: keyof typeof emptyForm, value: any) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    const handleSavePermission = () => {
        const { employeeId, startDate, endDate, status } = formState;
        if (!employeeId || !startDate || !endDate || !status) {
            toast({
                title: "Error de validación",
                description: "Debe completar todos los campos obligatorios: Empleado, Desde, Hasta y Estado.",
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
        
        const permissionData = {
            employeeId,
            startDate: format(startDate, "yyyy-MM-dd"),
            endDate: format(endDate, "yyyy-MM-dd"),
            status,
            observations: formState.observations || '',
        };

        startTransition(async () => {
            try {
                const newPermission = await addPermission(permissionData);
                setPermissions(prev => [...prev, newPermission]);
                toast({
                    title: "Permiso cargado",
                    description: `El permiso para el empleado ha sido registrado con éxito.`,
                });
                setIsFormOpen(false);
                setFormState(emptyForm);
            } catch (error) {
                toast({
                    title: "Error al cargar permiso",
                    description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
                    variant: "destructive",
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
                            <CardTitle>Listado de Permisos</CardTitle>
                            <CardDescription>
                                Vea y agregue nuevos permisos para los empleados.
                            </CardDescription>
                        </div>
                        <Button onClick={() => { setFormState(emptyForm); setIsFormOpen(true); }}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Cargar Permiso
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Empleado</TableHead>
                                    <TableHead>Desde</TableHead>
                                    <TableHead>Hasta</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Observaciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {permissions.length > 0 ? (
                                    permissions.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map((perm) => (
                                        <TableRow key={perm.id}>
                                            <TableCell className="font-medium">{employeeMap.get(perm.employeeId) || 'Empleado no encontrado'}</TableCell>
                                            <TableCell>{format(new Date(perm.startDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })}</TableCell>
                                            <TableCell>{format(new Date(perm.endDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })}</TableCell>
                                            <TableCell>
                                                <Badge variant={perm.status.startsWith('APROBADO') ? 'default' : 'destructive'}
                                                    className={perm.status.startsWith('APROBADO') ? 'bg-green-600' : ''}>
                                                    {perm.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate" title={perm.observations}>{perm.observations}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No hay permisos cargados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Cargar Nuevo Permiso</DialogTitle>
                        <DialogDescription>
                            Complete la información para registrar un nuevo permiso.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="employeeId">Empleado *</Label>
                            <Combobox
                                options={employeeOptions}
                                value={formState.employeeId}
                                onValueChange={(value) => handleInputChange('employeeId', value)}
                                placeholder="Seleccione un empleado"
                                searchPlaceholder="Buscar por nombre, legajo..."
                                emptyMessage="No se encontró el empleado."
                                disabled={isPending}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Desde *</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formState.startDate ? format(formState.startDate, 'PPP', { locale: es }) : <span>Seleccione fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={formState.startDate} onSelect={(date) => handleInputChange('startDate', date)} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endDate">Hasta *</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formState.endDate ? format(formState.endDate, 'PPP', { locale: es }) : <span>Seleccione fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={formState.endDate} onSelect={(date) => handleInputChange('endDate', date)} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Estado *</Label>
                            <Select onValueChange={(value: PermissionStatus) => handleInputChange('status', value)} value={formState.status} disabled={isPending}>
                                <SelectTrigger><SelectValue placeholder="Seleccione un estado" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="APROBADO POR SUPERVISOR">APROBADO POR SUPERVISOR</SelectItem>
                                    <SelectItem value="APROBADO POR RRHH">APROBADO POR RRHH</SelectItem>
                                    <SelectItem value="NO APROBADO">NO APROBADO</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="observations">Observaciones</Label>
                            <Textarea
                                id="observations"
                                value={formState.observations}
                                onChange={(e) => handleInputChange('observations', e.target.value)}
                                placeholder="Añadir observaciones..."
                                disabled={isPending}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>Cancelar</Button></DialogClose>
                        <Button type="submit" onClick={handleSavePermission} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Permiso
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
