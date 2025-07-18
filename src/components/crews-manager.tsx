
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
import { Loader2, PlusCircle, Trash2, Pencil, Plus, X, Search, CalendarIcon, ArrowRightLeft, AlertTriangle } from "lucide-react";
import type { Crew, Project, Employee, Phase, CrewPhaseAssignment } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar } from "./ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { moveEmployeeBetweenCrews } from "@/app/actions";

interface CrewsManagerProps {
  initialCrews: Crew[];
  initialProjects: Project[];
  initialEmployees: Employee[];
  initialPhases: Phase[];
}

const emptyForm = {
    name: "",
    projectId: "",
    capatazId: "",
    apuntadorId: "",
    jefeDeObraId: "",
    controlGestionId: "",
    employeeIds: [] as string[],
    assignedPhases: [] as CrewPhaseAssignment[],
};

export default function CrewsManager({ initialCrews, initialProjects, initialEmployees, initialPhases }: CrewsManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [allCrews, setAllCrews] = useState<Crew[]>(initialCrews);
  const [isCrewDialogOpen, setIsCrewDialogOpen] = useState(false);
  const [crewToDelete, setCrewToDelete] = useState<Crew | null>(null);
  const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [newCrewState, setNewCrewState] = useState(emptyForm);
  const [personnelSearchTerm, setPersonnelSearchTerm] = useState("");
  const [phaseAssignment, setPhaseAssignment] = useState<{phaseId: string; startDate?: Date; endDate?: Date}>({ phaseId: "" });
  const [employeeToMove, setEmployeeToMove] = useState<Employee | null>(null);
  const [destinationCrewId, setDestinationCrewId] = useState("");

  
  const [isPending, startTransition] = useTransition();

  const canEditInfo = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('crews.editInfo'), [user]);
  const canAssignPhase = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('crews.assignPhase'), [user]);
  const canManagePersonnel = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('crews.managePersonnel'), [user]);

  const canSave = canEditInfo || canAssignPhase || canManagePersonnel;

  const phaseMap = useMemo(() => new Map(initialPhases.map(p => [p.id, p])), [initialPhases]);
  const projectMap = useMemo(() => new Map(initialProjects.map(p => [p.id, p.name])), [initialProjects]);
  const crewMap = useMemo(() => new Map(allCrews.map(c => [c.id, c.name])), [allCrews]);

  const employeeAssignments = useMemo(() => {
    const assignments = new Map<string, string[]>();
    for (const crew of allCrews) {
        for (const empId of crew.employeeIds) {
            if (!assignments.has(empId)) {
                assignments.set(empId, []);
            }
            assignments.get(empId)!.push(crew.name);
        }
    }
    return assignments;
  }, [allCrews]);

  const availableCrewsForMove = useMemo(() => {
    if (!editingCrew) return [];
    return allCrews
        .filter(c => c.id !== editingCrew.id)
        .map(c => ({ value: c.id, label: `${c.name} (${projectMap.get(c.projectId)})` }));
  }, [allCrews, editingCrew, projectMap]);

  useEffect(() => {
    if (isCrewDialogOpen) {
      if (editingCrew) {
        setNewCrewState({ 
            ...editingCrew, 
            employeeIds: editingCrew.employeeIds || [],
            assignedPhases: (editingCrew.assignedPhases || []).map(p => ({
                ...p,
                startDate: p.startDate,
                endDate: p.endDate
            }))
        });
      } else {
        const initialProjectId = selectedProjectId !== 'all' ? selectedProjectId : "";
        setNewCrewState({...emptyForm, projectId: initialProjectId});
      }
    } else {
      setPersonnelSearchTerm("");
      setPhaseAssignment({ phaseId: "" });
    }
  }, [editingCrew, isCrewDialogOpen, selectedProjectId]);

  const employeeNameMap = useMemo(() => {
    return Object.fromEntries(initialEmployees.map(emp => [emp.id, `${emp.nombre} ${emp.apellido}`]));
  }, [initialEmployees]);

  const employeeOptions = useMemo(() => {
    return initialEmployees.map(emp => ({
        value: emp.id,
        label: `${emp.nombre} ${emp.apellido} (L: ${emp.legajo}${emp.cuil ? `, C: ${emp.cuil}` : ''})`
    }));
  }, [initialEmployees]);

  const phaseOptions = useMemo(() => {
    return initialPhases.map(phase => ({
        value: phase.id,
        label: `${phase.name} (${phase.pepElement})`
    }));
  }, [initialPhases]);

  const jornalEmployees = useMemo(() => {
    return initialEmployees.filter(emp => emp.condicion === 'jornal' && emp.estado === 'activo');
  }, [initialEmployees]);

  const availablePersonnel = useMemo(() => {
    const lowerCaseSearch = personnelSearchTerm.toLowerCase().trim();
    if (!lowerCaseSearch) {
        return [];
    }
    return jornalEmployees
        .filter(emp => {
            const isNotAssigned = !newCrewState.employeeIds.includes(emp.id);
            if (!isNotAssigned) return false;

            const fullName = `${emp.nombre} ${emp.apellido}`.toLowerCase();
            const legajo = emp.legajo;
            
            return fullName.includes(lowerCaseSearch) || 
                   legajo.includes(lowerCaseSearch) ||
                   (emp.cuil && emp.cuil.includes(lowerCaseSearch));
        });
  }, [jornalEmployees, newCrewState.employeeIds, personnelSearchTerm]);

  const assignedPersonnel = useMemo(() => {
    return jornalEmployees.filter(emp => newCrewState.employeeIds.includes(emp.id));
  }, [jornalEmployees, newCrewState.employeeIds]);

  const filteredCrews = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();

    let crews = allCrews;
    if (selectedProjectId !== "all") {
        crews = crews.filter(crew => crew.projectId === selectedProjectId);
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
  }, [allCrews, selectedProjectId, searchTerm, employeeNameMap]);
  
  const handleInputChange = (field: keyof typeof emptyForm, value: any) => {
    setNewCrewState(prev => ({ ...prev, [field]: value }));
  };

  const handleAddPhaseAssignment = () => {
    const { phaseId, startDate, endDate } = phaseAssignment;
    if (!phaseId || !startDate || !endDate) return;

    if (endDate < startDate) {
        toast({
            title: "Error de validación",
            description: "La fecha de fin no puede ser anterior a la de inicio.",
            variant: "destructive"
        });
        return;
    }

    const newAssignment: CrewPhaseAssignment = {
        id: crypto.randomUUID(),
        phaseId,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
    };
    
    handleInputChange('assignedPhases', [...(newCrewState.assignedPhases || []), newAssignment]);
    setPhaseAssignment({ phaseId: "" });
  };

  const handleRemovePhaseAssignment = (assignmentId: string) => {
    handleInputChange('assignedPhases', (newCrewState.assignedPhases || []).filter(p => p.id !== assignmentId));
  };

  const handleSaveCrew = () => {
    const { name, projectId, capatazId, apuntadorId, jefeDeObraId, controlGestionId } = newCrewState;
    if (!name.trim() || !projectId || !capatazId || !apuntadorId || !jefeDeObraId || !controlGestionId) {
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
          const docRef = doc(db, "crews", editingCrew.id);
          await updateDoc(docRef, newCrewState);
          const updatedCrew = { id: editingCrew.id, ...newCrewState } as Crew;
          setAllCrews(prev => prev.map(c => c.id === updatedCrew.id ? updatedCrew : c));
          toast({
            title: "Cuadrilla actualizada",
            description: `La cuadrilla "${updatedCrew.name}" ha sido actualizada.`,
          });
        } else {
          const docRef = await addDoc(collection(db, "crews"), newCrewState);
          const newCrew = { id: docRef.id, ...newCrewState } as Crew;
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
        await deleteDoc(doc(db, "crews", crewToDelete.id));
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
  
  const handleOpenMoveDialog = (employee: Employee) => {
    setEmployeeToMove(employee);
    setDestinationCrewId("");
  };

  const handleMoveEmployee = () => {
    if (!employeeToMove || !destinationCrewId || !editingCrew) return;

    startTransition(async () => {
        try {
            await moveEmployeeBetweenCrews(employeeToMove!.id, editingCrew!.id, destinationCrewId);

            setAllCrews(prev => {
                return prev.map(crew => {
                    if (crew.id === editingCrew!.id) {
                        return { ...crew, employeeIds: crew.employeeIds.filter(id => id !== employeeToMove!.id) };
                    }
                    if (crew.id === destinationCrewId) {
                        return { ...crew, employeeIds: [...crew.employeeIds, employeeToMove!.id] };
                    }
                    return crew;
                });
            });

            setNewCrewState(prev => ({...prev, employeeIds: prev.employeeIds.filter(id => id !== employeeToMove!.id)}));

            toast({
                title: "Empleado Movido",
                description: `${employeeToMove!.apellido}, ${employeeToMove!.nombre} ha sido movido con éxito.`,
            });

            setEmployeeToMove(null);
            setDestinationCrewId("");

        } catch (error) {
            toast({
                title: "Error al mover",
                description: error instanceof Error ? error.message : "No se pudo mover el empleado.",
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
                    <CardTitle>Lista de Cuadrillas</CardTitle>
                    <CardDescription>
                        Busque, filtre por proyecto o gestione las cuadrillas existentes.
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
                    <Select onValueChange={setSelectedProjectId} defaultValue="all">
                        <SelectTrigger className="w-full sm:w-[250px]">
                            <SelectValue placeholder="Filtrar por proyecto..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Proyectos</SelectItem>
                            {initialProjects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleOpenAddDialog} disabled={!canEditInfo}>
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
                            <TableHead>Jefe de Proyecto</TableHead>
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
                                            disabled={isPending || !canSave}
                                        >
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">Editar {crew.name}</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={() => setCrewToDelete(crew)}
                                            disabled={isPending || !canEditInfo}
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
      
    <TooltipProvider>
      <Dialog open={isCrewDialogOpen} onOpenChange={(open) => { setIsCrewDialogOpen(open); if (!open) setEditingCrew(null); }}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingCrew ? "Editar Cuadrilla" : "Agregar Nueva Cuadrilla"}</DialogTitle>
            <DialogDescription>
              Complete los detalles de la cuadrilla y asigne el personal necesario.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
            <fieldset disabled={isPending || !canEditInfo}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="crew-name">Nombre</Label>
                    <Input id="crew-name" value={newCrewState.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="Ej. Equipo de Montaje"/>
                </div>
                <div>
                    <Label htmlFor="crew-project">Proyecto</Label>
                    <Select onValueChange={(value) => handleInputChange('projectId', value)} value={newCrewState.projectId}>
                    <SelectTrigger><SelectValue placeholder="Seleccione un proyecto" /></SelectTrigger>
                    <SelectContent>
                        {initialProjects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
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
                    />
                </div>
                <div>
                    <Label htmlFor="crew-jefe">Jefe de Proyecto</Label>
                    <Combobox
                        options={employeeOptions}
                        value={newCrewState.jefeDeObraId}
                        onValueChange={(value) => handleInputChange('jefeDeObraId', value)}
                        placeholder="Seleccione un empleado"
                        searchPlaceholder="Buscar por nombre, legajo o CUIL..."
                        emptyMessage="No se encontró el empleado."
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
                    />
                </div>
                </div>
            </fieldset>
            <Separator className="my-4" />
            <fieldset disabled={isPending || !canAssignPhase}>
                <h3 className="mb-4 text-lg font-medium leading-none">Asignar Fases</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 rounded-md border p-4">
                        <h4 className="font-semibold text-sm">Asignar Fases</h4>
                        <div className="space-y-2">
                            <Label htmlFor="phase-id">Fase</Label>
                            <Combobox
                                options={phaseOptions}
                                value={phaseAssignment.phaseId}
                                onValueChange={(value) => setPhaseAssignment(p => ({...p, phaseId: value}))}
                                placeholder="Seleccione una fase"
                                searchPlaceholder="Buscar fase..."
                                emptyMessage="Fase no encontrada."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Fecha Inicio</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {phaseAssignment.startDate ? format(phaseAssignment.startDate, 'PPP', { locale: es }) : <span>Seleccione una fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={phaseAssignment.startDate} onSelect={(d) => setPhaseAssignment(p => ({...p, startDate: d}))} initialFocus locale={es} />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha Fin</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {phaseAssignment.endDate ? format(phaseAssignment.endDate, 'PPP', { locale: es }) : <span>Seleccione una fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={phaseAssignment.endDate} onSelect={(d) => setPhaseAssignment(p => ({...p, endDate: d}))} initialFocus locale={es} />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        <Button onClick={handleAddPhaseAssignment} className="w-full" disabled={!phaseAssignment.phaseId || !phaseAssignment.startDate || !phaseAssignment.endDate}>
                            <Plus className="mr-2 h-4 w-4" /> Agregar Fase
                        </Button>
                    </div>
                     <div className="flex flex-col gap-2">
                        <h4 className="font-semibold text-sm">Fases Asignadas ({(newCrewState.assignedPhases || []).length})</h4>
                        <ScrollArea className="flex-1 h-60 rounded-md border p-2">
                             {(newCrewState.assignedPhases || []).length > 0 ? (newCrewState.assignedPhases || []).map(p => (
                                <div key={p.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                    <div>
                                        <p className="font-medium">{phaseMap.get(p.phaseId)?.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {format(new Date(p.startDate), 'P', {locale: es})} - {format(new Date(p.endDate), 'P', {locale: es})}
                                        </p>
                                    </div>
                                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleRemovePhaseAssignment(p.id)}>
                                        <X className="h-4 w-4" />
                                        <span className="sr-only">Quitar fase {phaseMap.get(p.phaseId)?.name}</span>
                                    </Button>
                                </div>
                            )) : (
                                <div className="text-center text-sm text-muted-foreground py-4">
                                    No hay fases asignadas.
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </fieldset>
            <Separator className="my-4" />
            <fieldset disabled={isPending || !canManagePersonnel}>
                <h3 className="mb-4 text-lg font-medium leading-none">Asignar Personal <Badge variant="outline">Jornal Activo</Badge></h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-72">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-sm">Personal Disponible</h4>
                            {personnelSearchTerm && <Badge variant="secondary">{availablePersonnel.length} encontrados</Badge>}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="personnel-search"
                                placeholder="Buscar por nombre, apellido, legajo o CUIL..."
                                value={personnelSearchTerm}
                                onChange={(e) => setPersonnelSearchTerm(e.target.value)}
                                className="pl-10 h-9"
                            />
                        </div>
                        <ScrollArea className="flex-1 rounded-md border p-2">
                            {availablePersonnel.length > 0 ? availablePersonnel.map(emp => (
                                <div key={emp.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                    <div>
                                        <p className="font-medium">{employeeNameMap[emp.id]}</p>
                                        <p className="text-xs text-muted-foreground">L: {emp.legajo}</p>
                                    </div>
                                    <Button size="icon" variant="outline" onClick={() => handleInputChange('employeeIds', [...newCrewState.employeeIds, emp.id])}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            )) : (
                                <div className="text-center text-sm text-muted-foreground py-4">
                                    {personnelSearchTerm ? "No se encontraron empleados." : "Escriba para buscar personal."}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                    <div className="flex flex-col gap-2">
                        <h4 className="font-semibold text-sm">Personal Asignado ({assignedPersonnel.length})</h4>
                        <div className="h-9" /> {/* Spacer to align */}
                        <ScrollArea className="flex-1 rounded-md border p-2">
                             {assignedPersonnel.length > 0 ? assignedPersonnel.map(emp => {
                                const assignments = employeeAssignments.get(emp.id) || [];
                                const isDuplicate = assignments.length > 1;

                                return (
                                   <div key={emp.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                    <div className="flex items-center gap-2">
                                        <div>
                                            <p className="font-medium">{employeeNameMap[emp.id]}</p>
                                            <p className="text-xs text-muted-foreground">L: {emp.legajo}</p>
                                        </div>
                                        {isDuplicate && (
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <AlertTriangle className="h-4 w-4 text-destructive" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>También asignado en: {assignments.filter(cName => cName !== newCrewState.name).join(', ')}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                    <div className="flex items-center">
                                      <Button size="icon" variant="ghost" onClick={() => handleOpenMoveDialog(emp)}>
                                        <ArrowRightLeft className="h-4 w-4" />
                                      </Button>
                                      <Button size="icon" variant="destructive" onClick={() => handleInputChange('employeeIds', newCrewState.employeeIds.filter(id => id !== emp.id))}>
                                          <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                </div>
                            )}) : (
                                <div className="text-center text-sm text-muted-foreground py-4">
                                    No hay personal asignado.
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </fieldset>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>Cancelar</Button></DialogClose>
            <Button type="submit" onClick={handleSaveCrew} disabled={isPending || !canSave}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
      
      <Dialog open={!!employeeToMove} onOpenChange={(open) => !open && setEmployeeToMove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover Empleado</DialogTitle>
            <DialogDescription>
              Mover a <strong>{employeeToMove?.apellido}, {employeeToMove?.nombre}</strong> a otra cuadrilla.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="destination-crew">Cuadrilla de Destino</Label>
            <Select value={destinationCrewId} onValueChange={setDestinationCrewId}>
              <SelectTrigger id="destination-crew">
                <SelectValue placeholder="Seleccione una cuadrilla" />
              </SelectTrigger>
              <SelectContent>
                {availableCrewsForMove.map(crew => (
                  <SelectItem key={crew.value} value={crew.value}>{crew.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
            <Button onClick={handleMoveEmployee} disabled={isPending || !destinationCrewId}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!crewToDelete} onOpenChange={(open) => !open && setCrewToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente la cuadrilla "{crewToDelete?.name}". No podrá eliminar una cuadrilla si tiene registros de asistencia asociados.
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
