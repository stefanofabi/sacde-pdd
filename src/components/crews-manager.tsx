"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
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
import { Loader2, PlusCircle, Trash2, Pencil, Plus, X, Search } from "lucide-react";
import type { Crew, Obra, Employee } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addCrew, deleteCrew, updateCrew } from "@/app/actions";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";

interface CrewsManagerProps {
  initialCrews: Crew[];
  initialObras: Obra[];
  initialEmployees: Employee[];
}

const emptyForm = {
    name: "",
    obraId: "",
    capatazId: "",
    apuntadorId: "",
    jefeDeObraId: "",
    controlGestionId: "",
    employeeIds: [] as string[],
};

export default function CrewsManager({ initialCrews, initialObras, initialEmployees }: CrewsManagerProps) {
  const { toast } = useToast();
  const [allCrews, setAllCrews] = useState<Crew[]>(initialCrews);
  const [isCrewDialogOpen, setIsCrewDialogOpen] = useState(false);
  const [crewToDelete, setCrewToDelete] = useState<Crew | null>(null);
  const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
  const [selectedObraId, setSelectedObraId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [newCrewState, setNewCrewState] = useState(emptyForm);
  
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isCrewDialogOpen) {
      if (editingCrew) {
        setNewCrewState({ ...editingCrew, employeeIds: editingCrew.employeeIds || [] });
      } else {
        const initialObraId = selectedObraId !== 'all' ? selectedObraId : "";
        setNewCrewState({...emptyForm, obraId: initialObraId});
      }
    }
  }, [editingCrew, isCrewDialogOpen, selectedObraId]);

  const employeeNameMap = useMemo(() => {
    return Object.fromEntries(initialEmployees.map(emp => [emp.id, `${emp.nombre} ${emp.apellido}`]));
  }, [initialEmployees]);

  const employeeOptions = useMemo(() => {
    return initialEmployees.map(emp => ({
        value: emp.id,
        label: `${emp.nombre} ${emp.apellido} (L: ${emp.legajo}${emp.cuil ? `, C: ${emp.cuil}` : ''})`
    }));
  }, [initialEmployees]);

  const jornalEmployees = useMemo(() => {
    return initialEmployees.filter(emp => emp.condicion === 'jornal' && emp.estado === 'activo');
  }, [initialEmployees]);

  const filteredCrews = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();

    let crews = allCrews;
    if (selectedObraId !== "all") {
        crews = crews.filter(crew => crew.obraId === selectedObraId);
    }
    
    if (!lowerCaseSearchTerm) {
        return crews;
    }

    return crews.filter((crew) =>
        crew.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        (employeeNameMap[crew.capatazId] || '').toLowerCase().includes(lowerCaseSearchTerm) ||
        (employeeNameMap[crew.apuntadorId] || '').toLowerCase().includes(lowerCaseSearchTerm) ||
        (employeeNameMap[crew.jefeDeObraId] || '').toLowerCase().includes(lowerCaseSearchTerm) ||
        (employeeNameMap[crew.controlGestionId] || '').toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [allCrews, selectedObraId, searchTerm, employeeNameMap]);
  
  const handleInputChange = (field: keyof typeof emptyForm, value: string | string[]) => {
    setNewCrewState(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveCrew = () => {
    const { name, obraId, capatazId, apuntadorId, jefeDeObraId, controlGestionId } = newCrewState;
    if (!name.trim() || !obraId || !capatazId || !apuntadorId || !jefeDeObraId || !controlGestionId) {
      toast({
        title: "Error de validación",
        description: "Debe completar todos los campos para crear una cuadrilla.",
        variant: "destructive",
      });
      return;
    }
    startTransition(async () => {
      try {
        if (editingCrew) {
          const updatedCrew = await updateCrew(editingCrew.id, newCrewState);
          setAllCrews(prev => prev.map(c => c.id === updatedCrew.id ? updatedCrew : c));
          toast({
            title: "Cuadrilla actualizada",
            description: `La cuadrilla "${updatedCrew.name}" ha sido actualizada.`,
          });
        } else {
          const newCrew = await addCrew(newCrewState);
          setAllCrews((prev) => [...prev, newCrew]);
          toast({
            title: "Cuadrilla agregada",
            description: `La cuadrilla "${newCrew.name}" ha sido creada.`,
          });
        }
        setIsCrewDialogOpen(false);
        setEditingCrew(null);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "No se pudo guardar la cuadrilla.",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleDeleteCrew = () => {
    if (!crewToDelete) return;

    startTransition(async () => {
      try {
        await deleteCrew(crewToDelete.id);
        setAllCrews((prev) => prev.filter((c) => c.id !== crewToDelete.id));
        toast({
          title: "Cuadrilla eliminada",
          description: `La cuadrilla "${crewToDelete.name}" ha sido eliminada con éxito.`,
        });
      } catch (error) {
        toast({
          title: "Error al eliminar",
          description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
          variant: "destructive",
        });
      } finally {
        setCrewToDelete(null);
      }
    });
  };

  const handleOpenAddDialog = () => {
    setEditingCrew(null);
    setIsCrewDialogOpen(true);
  }

  const handleOpenEditDialog = (crew: Crew) => {
    setEditingCrew(crew);
    setIsCrewDialogOpen(true);
  }

  return (
    <>
      <Card>
        <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <CardTitle>Lista de Cuadrillas</CardTitle>
                    <CardDescription>
                        Busque, filtre por obra o gestione las cuadrillas existentes.
                    </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar cuadrilla..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full sm:w-[200px]"
                        />
                    </div>
                    <Select onValueChange={setSelectedObraId} defaultValue="all">
                        <SelectTrigger className="w-full sm:w-[250px]">
                            <SelectValue placeholder="Filtrar por obra..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las Obras</SelectItem>
                            {initialObras.map((obra) => (
                                <SelectItem key={obra.id} value={obra.id}>
                                    {obra.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleOpenAddDialog}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Agregar Cuadrilla
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Capataz</TableHead>
                            <TableHead>Apuntador</TableHead>
                            <TableHead>Jefe de Obra</TableHead>
                            <TableHead>Control y Gestión</TableHead>
                            <TableHead className="text-center">Personal</TableHead>
                            <TableHead className="text-right w-[120px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCrews.length > 0 ? (
                            filteredCrews.map((crew) => (
                                <TableRow key={crew.id}>
                                    <TableCell className="font-medium">{crew.name}</TableCell>
                                    <TableCell>{employeeNameMap[crew.capatazId] || 'N/A'}</TableCell>
                                    <TableCell>{employeeNameMap[crew.apuntadorId] || 'N/A'}</TableCell>
                                    <TableCell>{employeeNameMap[crew.jefeDeObraId] || 'N/A'}</TableCell>
                                    <TableCell>{employeeNameMap[crew.controlGestionId] || 'N/A'}</TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant="secondary">{crew.employeeIds?.length || 0}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                         <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleOpenEditDialog(crew)}
                                            disabled={isPending}
                                        >
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">Editar {crew.name}</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={() => setCrewToDelete(crew)}
                                            disabled={isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Eliminar {crew.name}</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    {allCrews.length === 0 
                                        ? "No hay cuadrillas creadas." 
                                        : "No se encontraron cuadrillas con los filtros aplicados."
                                    }
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      
      <Dialog open={isCrewDialogOpen} onOpenChange={setIsCrewDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingCrew ? 'Editar Cuadrilla' : 'Agregar Nueva Cuadrilla'}</DialogTitle>
            <DialogDescription>
              Complete los detalles de la cuadrilla y asigne el personal necesario.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="crew-name">Nombre</Label>
                <Input id="crew-name" value={newCrewState.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="Ej. Equipo de Montaje" disabled={isPending}/>
              </div>
              <div>
                <Label htmlFor="crew-obra">Obra</Label>
                 <Select onValueChange={(value) => handleInputChange('obraId', value)} value={newCrewState.obraId} disabled={isPending}>
                  <SelectTrigger><SelectValue placeholder="Seleccione una obra" /></SelectTrigger>
                  <SelectContent>
                    {initialObras.map((obra) => <SelectItem key={obra.id} value={obra.id}>{obra.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="crew-capataz">Capataz</Label>
                 <Combobox
                    options={employeeOptions}
                    value={newCrewState.capatazId}
                    onValueChange={(value) => handleInputChange('capatazId', value)}
                    placeholder="Seleccione un empleado"
                    searchPlaceholder="Buscar por nombre, legajo o CUIL..."
                    emptyMessage="No se encontró el empleado."
                    disabled={isPending}
                  />
              </div>
              <div>
                <Label htmlFor="crew-apuntador">Apuntador</Label>
                 <Combobox
                    options={employeeOptions}
                    value={newCrewState.apuntadorId}
                    onValueChange={(value) => handleInputChange('apuntadorId', value)}
                    placeholder="Seleccione un empleado"
                    searchPlaceholder="Buscar por nombre, legajo o CUIL..."
                    emptyMessage="No se encontró el empleado."
                    disabled={isPending}
                  />
              </div>
              <div>
                <Label htmlFor="crew-jefe">Jefe de Obra</Label>
                 <Combobox
                    options={employeeOptions}
                    value={newCrewState.jefeDeObraId}
                    onValueChange={(value) => handleInputChange('jefeDeObraId', value)}
                    placeholder="Seleccione un empleado"
                    searchPlaceholder="Buscar por nombre, legajo o CUIL..."
                    emptyMessage="No se encontró el empleado."
                    disabled={isPending}
                  />
              </div>
               <div>
                <Label htmlFor="crew-control" className="whitespace-nowrap">Control y Gestión</Label>
                 <Combobox
                    options={employeeOptions}
                    value={newCrewState.controlGestionId}
                    onValueChange={(value) => handleInputChange('controlGestionId', value)}
                    placeholder="Seleccione un empleado"
                    searchPlaceholder="Buscar por nombre, legajo o CUIL..."
                    emptyMessage="No se encontró el empleado."
                    disabled={isPending}
                  />
              </div>
            </div>
            <Separator className="my-4" />
             <div>
                <h3 className="mb-4 text-lg font-medium leading-none">Asignar Personal <Badge variant="outline">Jornal Activo</Badge></h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-72">
                    <div className="flex flex-col gap-2">
                        <h4 className="font-semibold text-sm">Personal Disponible</h4>
                        <ScrollArea className="flex-1 rounded-md border p-2">
                            {jornalEmployees
                                .filter(emp => !newCrewState.employeeIds.includes(emp.id))
                                .map(emp => (
                                <div key={emp.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                    <div>
                                        <p className="font-medium">{employeeNameMap[emp.id]}</p>
                                        <p className="text-xs text-muted-foreground">L: {emp.legajo}</p>
                                    </div>
                                    <Button size="icon" variant="outline" onClick={() => handleInputChange('employeeIds', [...newCrewState.employeeIds, emp.id])} disabled={isPending}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </ScrollArea>
                    </div>
                    <div className="flex flex-col gap-2">
                         <h4 className="font-semibold text-sm">Personal Asignado ({newCrewState.employeeIds.length})</h4>
                        <ScrollArea className="flex-1 rounded-md border p-2">
                             {jornalEmployees
                                .filter(emp => newCrewState.employeeIds.includes(emp.id))
                                .map(emp => (
                                   <div key={emp.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                    <div>
                                        <p className="font-medium">{employeeNameMap[emp.id]}</p>
                                        <p className="text-xs text-muted-foreground">L: {emp.legajo}</p>
                                    </div>
                                    <Button size="icon" variant="destructive" onClick={() => handleInputChange('employeeIds', newCrewState.employeeIds.filter(id => id !== emp.id))} disabled={isPending}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </ScrollArea>
                    </div>
                </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>Cancelar</Button></DialogClose>
            <Button type="submit" onClick={handleSaveCrew} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!crewToDelete} onOpenChange={(open) => !open && setCrewToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Está absolutely seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente la cuadrilla "{crewToDelete?.name}".
                    No podrá eliminar una cuadrilla si tiene registros de asistencia asociados.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setCrewToDelete(null)} disabled={isPending}>
                    Cancelar
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteCrew} 
                  disabled={isPending}
                  className={buttonVariants({ variant: "destructive" })}
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, eliminar cuadrilla"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
