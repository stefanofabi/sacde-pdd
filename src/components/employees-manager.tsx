
"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Loader2, PlusCircle, Trash2, Search, Pencil, FileSpreadsheet } from "lucide-react";
import type { Employee, Project } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from 'xlsx';
import { db } from "@/lib/firebase";
import { deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";

interface EmployeesManagerProps {
  initialEmployees: Employee[];
  initialProjects: Project[];
}

export default function EmployeesManager({ initialEmployees, initialProjects }: EmployeesManagerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();

  const canManage = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('employees.manage'), [user]);

  useEffect(() => {
    setEmployees(initialEmployees);
  }, [initialEmployees]);

  const projectNameMap = useMemo(() => {
    return Object.fromEntries(initialProjects.map(project => [project.id, project.name]));
  }, [initialProjects]);

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
  
  const handleOpenAddPage = () => {
    router.push('/empleados/nuevo');
  };

  const handleOpenEditPage = (employeeId: string) => {
    router.push(`/empleados/${employeeId}`);
  };

  const handleDeleteEmployee = () => {
    if (!employeeToDelete) return;

    startTransition(async () => {
      try {
        await deleteDoc(doc(db, "employees", employeeToDelete.id));
        setEmployees((prev) => prev.filter((e) => e.id !== employeeToDelete.id));
        toast({
          title: "Empleado eliminado",
          description: "El empleado ha sido eliminado con éxito.",
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

  const handleExport = () => {
    startTransition(() => {
        try {
            const dataToExport = employees.map(emp => ({
                "Legajo": emp.legajo,
                "Apellido": emp.apellido,
                "Nombre": emp.nombre,
                "CUIL": emp.cuil || '',
                "Fecha de Ingreso": emp.fechaIngreso ? format(new Date(emp.fechaIngreso + 'T00:00:00'), 'dd/MM/yyyy', { locale: es }) : '',
                "Proyecto": projectNameMap[emp.projectId] || 'N/A',
                "Posición": emp.denominacionPosicion,
                "Condición": emp.condicion,
                "Estado": emp.estado,
                "Celular": emp.celular || '',
                "Correo": emp.correo || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Empleados");
            
            const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
                wch: Math.max(
                    key.length,
                    ...dataToExport.map(row => (row[key as keyof typeof row] ? String(row[key as keyof typeof row]).length : 0))
                ) + 2
            }));
            worksheet['!cols'] = colWidths;
            
            XLSX.writeFile(workbook, `Listado_Empleados_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

            toast({
                title: "Exportación exitosa",
                description: "El listado de empleados se ha descargado.",
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

  const StatusBadge = ({ estado }: { estado: Employee['estado'] }) => (
    <Badge variant={estado === 'activo' ? 'default' : estado === 'baja' ? 'destructive' : 'secondary'}
        className={estado === 'activo' ? 'bg-green-600' : ''}>
        {estado === "activo" ? "Activo" : estado === "baja" ? "Baja" : "Suspendido"}
    </Badge>
  );

  const MobileEmployeeCard = ({ emp }: { emp: Employee }) => (
    <Card>
        <CardHeader>
            <CardTitle>{`${emp.apellido}, ${emp.nombre}`}</CardTitle>
            <CardDescription>Legajo: {emp.legajo}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
            <p><strong>Proyecto:</strong> {projectNameMap[emp.projectId] || 'N/A'}</p>
            <div className="flex items-center gap-2">
                <strong>Estado:</strong>
                <StatusBadge estado={emp.estado} />
            </div>
             <div className="flex items-center gap-2">
                <strong>Condición:</strong>
                <Badge variant={emp.condicion === 'mensual' ? 'secondary' : 'outline'}>{emp.condicion === "jornal" ? "Jornal" : "Mensual"}</Badge>
            </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEditPage(emp.id)}
                disabled={isPending || !canManage}
            >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
            </Button>
            <Button
                variant="destructive"
                size="sm"
                onClick={() => setEmployeeToDelete(emp)}
                disabled={isPending || !canManage}
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
            </Button>
        </CardFooter>
    </Card>
  );

  return (
    <>
      <Card>
        <CardHeader>
             <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <CardTitle>Lista de Empleados</CardTitle>
                    <CardDescription>
                        Busque, edite, agregue nuevos empleados o exporte el listado.
                    </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
                     <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar empleado..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full"
                        />
                    </div>
                    <Button onClick={handleExport} variant="outline" disabled={isPending} className="w-full sm:w-auto">
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Exportar a Excel
                    </Button>
                    <Button onClick={handleOpenAddPage} disabled={!canManage} className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Agregar Empleado
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            {isMobile ? (
                 <div className="space-y-4">
                    {filteredEmployees.length > 0 ? (
                        filteredEmployees.map((emp) => <MobileEmployeeCard key={emp.id} emp={emp} />)
                    ) : (
                         <p className="text-center text-muted-foreground py-8">
                            {employees.length === 0 
                                ? "No hay empleados creados."
                                : "No se encontraron empleados con los filtros aplicados."
                            }
                        </p>
                    )}
                </div>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Legajo</TableHead>
                                <TableHead>Apellido y Nombre</TableHead>
                                <TableHead>Proyecto</TableHead>
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
                                        <TableCell>{projectNameMap[emp.projectId] || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Badge variant={emp.condicion === 'mensual' ? 'secondary' : 'outline'}>{emp.condicion === "jornal" ? "Jornal" : "Mensual"}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge estado={emp.estado} />
                                        </TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenEditPage(emp.id)}
                                                disabled={isPending || !canManage}
                                            >
                                                <Pencil className="h-4 w-4" />
                                                <span className="sr-only">Editar {emp.nombre}</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:bg-destructive/10"
                                                onClick={() => setEmployeeToDelete(emp)}
                                                disabled={isPending || !canManage}
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
            )}
        </CardContent>
      </Card>
      
      <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente al empleado "{`${employeeToDelete?.nombre} ${employeeToDelete?.apellido}`}".
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
