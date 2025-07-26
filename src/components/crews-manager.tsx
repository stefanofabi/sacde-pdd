
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Loader2, PlusCircle, Trash2, Pencil, Search, Users } from "lucide-react";
import type { Crew, Project, Employee } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { db } from "@/lib/firebase";
import { deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

interface CrewsManagerProps {
  initialCrews: Crew[];
  initialProjects: Project[];
  initialEmployees: Employee[];
}

export default function CrewsManager({ initialCrews, initialProjects, initialEmployees }: CrewsManagerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [allCrews, setAllCrews] = useState<Crew[]>(initialCrews);
  const [crewToDelete, setCrewToDelete] = useState<Crew | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useState(false);

  const canEdit = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('crews.editInfo'), [user]);
  const canDelete = useMemo(() => user?.is_superuser || user?.role?.permissions.includes('crews.editInfo'), [user]);
  
  const projectMap = useMemo(() => new Map(initialProjects.map(p => [p.id, p.name])), [initialProjects]);
  const employeeNameMap = useMemo(() => new Map(initialEmployees.map(emp => [emp.id, `${emp.nombre} ${emp.apellido}`])), [initialEmployees]);

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
        (employeeNameMap.get(crew.capatazId) || '').toLowerCase().includes(lowerCaseSearchTerm) ||
        (employeeNameMap.get(crew.apuntadorId) || '').toLowerCase().includes(lowerCaseSearchTerm) ||
        (employeeNameMap.get(crew.jefeDeObraId) || '').toLowerCase().includes(lowerCaseSearchTerm) ||
        (employeeNameMap.get(crew.controlGestionId) || '').toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [allCrews, selectedProjectId, searchTerm, employeeNameMap]);
  
  const handleDeleteCrew = () => {
    if (!crewToDelete) return;
    startTransition(true);
    deleteDoc(doc(db, "crews", crewToDelete.id))
        .then(() => {
            setAllCrews((prev) => prev.filter((c) => c.id !== crewToDelete.id));
            toast({
                title: "Cuadrilla eliminada",
                description: `La cuadrilla "${crewToDelete.name}" ha sido eliminada con éxito.`,
            });
        })
        .catch((error) => {
            toast({
                title: "Error al eliminar",
                description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
                variant: "destructive",
            });
        })
        .finally(() => {
            setCrewToDelete(null);
            startTransition(false);
        });
  };

  const handleOpenAddPage = () => {
    router.push('/cuadrillas/nueva');
  }

  const handleOpenEditPage = (crewId: string) => {
    router.push(`/cuadrillas/${crewId}`);
  }

  const renderResponsibleName = (id: string, suplentes: string[] = []) => {
    const titularName = employeeNameMap.get(id);
    if (!titularName) return <Badge variant="destructive">N/A</Badge>;

    const suplentesCount = suplentes.length;
    const text = suplentesCount > 0 ? `${titularName} (+${suplentesCount})` : titularName;

    const tooltipContent = [titularName, ...suplentes.map(sId => employeeNameMap.get(sId) || 'N/A')].join(', ');
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="truncate block max-w-xs">{text}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Titular: {titularName}</p>
          {suplentesCount > 0 && <p>Suplentes: {suplentes.map(sId => employeeNameMap.get(sId) || 'N/A').join(', ')}</p>}
        </TooltipContent>
      </Tooltip>
    );
  };

  const MobileCrewCard = ({ crew }: { crew: Crew }) => (
    <Card>
        <CardHeader>
            <CardTitle>{crew.name}</CardTitle>
            <CardDescription>{projectMap.get(crew.projectId) || 'Sin proyecto'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
            <p><strong>Capataz:</strong> {employeeNameMap.get(crew.capatazId) || 'N/A'}</p>
            <p><strong>Jefe de Proyecto:</strong> {employeeNameMap.get(crew.jefeDeObraId) || 'N/A'}</p>
            <div className="flex items-center gap-2 pt-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{crew.employeeIds?.length || 0} Miembros</span>
            </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEditPage(crew.id)}
                disabled={isPending || !canEdit}
            >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
            </Button>
            <Button
                variant="destructive"
                size="sm"
                onClick={() => setCrewToDelete(crew)}
                disabled={isPending || !canDelete}
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
            </Button>
        </CardFooter>
    </Card>
  );

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <CardTitle>Lista de Cuadrillas</CardTitle>
                    <CardDescription>
                        Busque, filtre por proyecto o gestione las cuadrillas existentes.
                    </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar cuadrilla..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full"
                        />
                    </div>
                    <Select onValueChange={setSelectedProjectId} defaultValue="all">
                        <SelectTrigger className="w-full sm:w-auto">
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
                    <Button onClick={handleOpenAddPage} disabled={!canEdit} className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Agregar Cuadrilla
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            {isMobile ? (
                <div className="space-y-4">
                    {filteredCrews.length > 0 ? (
                        filteredCrews.map((crew) => <MobileCrewCard key={crew.id} crew={crew} />)
                    ) : (
                         <p className="text-center text-muted-foreground py-8">
                            {allCrews.length === 0 
                                ? "No hay cuadrillas creadas."
                                : "No se encontraron cuadrillas con los filtros aplicados."
                            }
                        </p>
                    )}
                </div>
            ) : (
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
                                        <TableCell>{renderResponsibleName(crew.capatazId, crew.capatazSuplenteIds)}</TableCell>
                                        <TableCell>{renderResponsibleName(crew.apuntadorId, crew.apuntadorSuplenteIds)}</TableCell>
                                        <TableCell>{renderResponsibleName(crew.jefeDeObraId, crew.jefeDeObraSuplenteIds)}</TableCell>
                                        <TableCell>{renderResponsibleName(crew.controlGestionId, crew.controlGestionSuplenteIds)}</TableCell>
                                        <TableCell className="text-center">
                                          <Badge variant="secondary">{crew.employeeIds?.length || 0}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-1">
                                             <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenEditPage(crew.id)}
                                                disabled={isPending || !canEdit}
                                            >
                                                <Pencil className="h-4 w-4" />
                                                <span className="sr-only">Editar {crew.name}</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:bg-destructive/10"
                                                onClick={() => setCrewToDelete(crew)}
                                                disabled={isPending || !canDelete}
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
            )}
        </CardContent>
      </Card>
      
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
    </TooltipProvider>
  );
}
