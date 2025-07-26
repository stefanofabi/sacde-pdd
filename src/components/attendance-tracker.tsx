
"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  Search,
  Loader2,
  Copy,
  UserPlus,
  Trash2,
} from "lucide-react";
import { format, startOfToday, subDays } from "date-fns";
import { es } from "date-fns/locale";
import type { Crew, AttendanceData, Project, Employee, AttendanceEntry } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, writeBatch } from "firebase/firestore";
import { useIsMobile } from "@/hooks/use-mobile";

interface AttendanceTrackerProps {
  initialCrews: Crew[];
  initialAttendance: AttendanceData;
  initialProjects: Project[];
  initialEmployees: Employee[];
}

export default function AttendanceTracker({ initialCrews, initialAttendance, initialProjects, initialEmployees }: AttendanceTrackerProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [allCrews, setAllCrews] = useState<Crew[]>(initialCrews);
  const [attendance, setAttendance] = useState<AttendanceData>(initialAttendance);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [sentStatusFilter, setSentStatusFilter] = useState<"all" | "sent" | "not-sent">("all");
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<AttendanceEntry | null>(null);
  
  const [newRequestState, setNewRequestState] = useState({ projectId: "", crewId: "", responsibleId: "" });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSelectedDate(startOfToday());
    }
  }, []);

  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const displayDate = selectedDate
    ? format(selectedDate, "PPP", { locale: es })
    : "Seleccione una fecha";

  const projectNameMap = useMemo(() => {
    return Object.fromEntries(initialProjects.map(project => [project.id, project.name]));
  }, [initialProjects]);

  const employeeNameMap = useMemo(() => {
    return Object.fromEntries(initialEmployees.map(emp => [emp.id, `${emp.firstName} ${emp.lastName}`]));
  }, [initialEmployees]);

  const employeeOptions = useMemo(() => {
    return initialEmployees.map(emp => ({
        value: emp.id,
        label: `${emp.firstName} ${emp.lastName} (L: ${emp.internalNumber}${emp.identificationNumber ? `, C: ${emp.identificationNumber}` : ''})`
    }));
  }, [initialEmployees]);
  
  const crewMap = useMemo(() => {
    return new Map(allCrews.map(crew => [crew.id, crew]));
  }, [allCrews]);

  const availableCrewsForRequest = useMemo(() => {
    if (!newRequestState.projectId) return [];
    return allCrews.filter(crew => crew.projectId === newRequestState.projectId);
  }, [allCrews, newRequestState.projectId]);
  
  const availableCrewOptionsForRequest = useMemo(() => {
    return availableCrewsForRequest.map(crew => ({
        value: crew.id,
        label: crew.name
    }));
  }, [availableCrewsForRequest]);
  
  const filteredEntriesForTable = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const dailyEntries = attendance[formattedDate] || [];
    
    return dailyEntries
      .filter((entry) => {
        if (sentStatusFilter === 'all') {
          return true;
        }
        return sentStatusFilter === 'sent' ? entry.sent : !entry.sent;
      })
      .filter((entry) => {
        const crew = crewMap.get(entry.crewId);
        if (!crew) return false;

        const responsibleName = entry.responsibleId ? (employeeNameMap[entry.responsibleId] || '') : '';
        
        return crew.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        (projectNameMap[crew.projectId] || '').toLowerCase().includes(lowerCaseSearchTerm) ||
        (responsibleName).toLowerCase().includes(lowerCaseSearchTerm)
    });
  }, [attendance, formattedDate, searchTerm, sentStatusFilter, crewMap, projectNameMap, employeeNameMap]);
  
  const handleUpdateSentStatus = (entryId: string, sent: boolean) => {
    if (!selectedDate) return;
    const dateKey = format(selectedDate, "yyyy-MM-dd");

    startTransition(async () => {
      try {
        const entryRef = doc(db, 'attendance', entryId);
        const sentAt = sent ? new Date().toISOString() : null;
        await updateDoc(entryRef, { sent, sentAt });
        
        const updatedEntry = { 
          id: entryId, 
          ...((attendance[dateKey] || []).find(e => e.id === entryId) as AttendanceEntry),
          sent,
          sentAt
        };

        setAttendance((prev) => {
           const newDailyData = (prev[dateKey] || []).map(e => e.id === entryId ? updatedEntry : e);
           return { ...prev, [dateKey]: newDailyData };
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: "No se pudo actualizar la asistencia.",
          variant: "destructive",
        });
      }
    });
  };

  const handleAddRequest = () => {
    if (!selectedDate || !newRequestState.projectId || !newRequestState.crewId || !newRequestState.responsibleId) {
      toast({
        title: "Error de validación",
        description: "Debe seleccionar un proyecto, una cuadrilla y un responsable.",
        variant: "destructive",
      });
      return;
    }
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    
    startTransition(async () => {
      try {
        const newEntryData = {
            date: dateKey,
            crewId: newRequestState.crewId,
            responsibleId: newRequestState.responsibleId,
            sent: false,
            sentAt: null,
        };

        const docRef = await addDoc(collection(db, 'attendance'), newEntryData);
        const newEntry = { id: docRef.id, ...newEntryData };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { date, ...rest } = newEntry;

        setAttendance(prev => {
            const currentEntries = prev[dateKey] || [];
            return {
                ...prev,
                [dateKey]: [...currentEntries, rest]
            };
        });
        setNewRequestState({ projectId: "", crewId: "", responsibleId: "" });
        setIsRequestDialogOpen(false);
        toast({
          title: "Solicitud creada",
          description: "La cuadrilla ha sido añadida al parte del día.",
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : "No se pudo agregar la solicitud.",
          variant: "destructive",
        });
      }
    });
  };

  const handleDeleteRequest = () => {
    if (!requestToDelete || !selectedDate) return;
    const dateKey = format(selectedDate, "yyyy-MM-dd");

    startTransition(async () => {
      try {
        await deleteDoc(doc(db, 'attendance', requestToDelete.id));
        setAttendance((prev) => {
          const updatedDailyData = (prev[dateKey] || []).filter(e => e.id !== requestToDelete.id);
          return { ...prev, [dateKey]: updatedDailyData };
        });
        toast({
          title: "Solicitud eliminada",
          description: "La solicitud de asistencia ha sido eliminada con éxito.",
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : "No se pudo eliminar la solicitud.",
          variant: "destructive",
        });
      } finally {
        setRequestToDelete(null);
      }
    });
  };

  const handleCloneDay = () => {
      if (!selectedDate) return;
      const dateKey = format(selectedDate, "yyyy-MM-dd");
      startTransition(async () => {
        try {
            const targetDate = new Date(dateKey);
            const previousDate = subDays(targetDate, 1);
            const previousDateKey = format(previousDate, "yyyy-MM-dd");

            const qPrev = query(collection(db, 'attendance'), where("date", "==", previousDateKey));
            const prevSnapshot = await getDocs(qPrev);
            
            const batch = writeBatch(db);

            const qCurrent = query(collection(db, 'attendance'), where("date", "==", dateKey));
            const currentSnapshot = await getDocs(qCurrent);
            currentSnapshot.docs.forEach(doc => batch.delete(doc.ref));

            const newEntriesForState: AttendanceEntry[] = [];
            prevSnapshot.docs.forEach(docSnap => {
                const entry = docSnap.data();
                const newEntry = {
                    date: dateKey,
                    crewId: entry.crewId,
                    responsibleId: entry.responsibleId,
                    sent: false,
                    sentAt: null,
                };
                const newDocRef = doc(collection(db, "attendance"));
                batch.set(newDocRef, newEntry);
                newEntriesForState.push({ id: newDocRef.id, ...newEntry });
            });

            await batch.commit();

            // Update state
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const newAttendanceForState = newEntriesForState.map(({ date, ...rest }) => rest);

            setAttendance(prev => ({ ...prev, [dateKey]: newAttendanceForState }));
            setIsCloneDialogOpen(false);
            toast({
                title: "Día clonado",
                description: "Se clonó la lista de cuadrillas y responsables del día anterior. Todos los estados se reiniciaron a 'no enviado'.",
            });
        } catch (error) {
             toast({
              title: "Error al clonar",
              description: "No se pudo clonar el día anterior. Es posible que no haya datos.",
              variant: "destructive",
            });
        }
      });
  }
  
  const MobileAttendanceCard = ({ entry }: { entry: AttendanceEntry }) => {
    const crew = crewMap.get(entry.crewId);
    if (!crew) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{crew.name}</CardTitle>
                <CardDescription>{projectNameMap[crew.projectId] || 'N/A'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                 <div>
                    <strong>Responsable:</strong>
                    <p>{employeeNameMap[entry.responsibleId ?? ''] || 'N/A'}</p>
                </div>
                 <div>
                    <strong>Fecha de Envío:</strong>
                    <p>{entry.sentAt ? format(new Date(entry.sentAt), 'Pp', { locale: es }) : "Pendiente"}</p>
                </div>
                 <div className="flex items-center justify-between">
                    <Label htmlFor={`switch-${entry.id}`} className="font-bold">Enviado</Label>
                    <Switch
                        id={`switch-${entry.id}`}
                        checked={entry.sent}
                        onCheckedChange={(checked) => handleUpdateSentStatus(entry.id, checked)}
                        disabled={isPending}
                        aria-label={`Marcar asistencia para ${crew.name}`}
                    />
                </div>
            </CardContent>
            <CardFooter>
                 <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => setRequestToDelete(entry)}
                    disabled={isPending}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar Solicitud
                </Button>
            </CardFooter>
        </Card>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Registro de Asistencia</CardTitle>
          <CardDescription>
            Seleccione una fecha y gestione las cuadrillas para el parte diario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row flex-wrap items-center gap-4 mb-6">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-full md:w-[280px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {displayDate}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  locale={es}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
            <div className="relative flex-1 min-w-[200px] w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cuadrilla, proyecto, responsable..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sentStatusFilter} onValueChange={(value: "all" | "sent" | "not-sent") => setSentStatusFilter(value)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="sent">Enviados</SelectItem>
                  <SelectItem value="not-sent">No Enviados</SelectItem>
                </SelectContent>
            </Select>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full md:w-auto">
                <Button onClick={() => setIsCloneDialogOpen(true)} variant="outline" className="w-full sm:w-auto">
                    <Copy className="mr-2 h-4 w-4" />
                    Clonar Día Anterior
                </Button>
                <Button onClick={() => { setNewRequestState({ projectId: "", crewId: "", responsibleId: "" }); setIsRequestDialogOpen(true); }} className="w-full sm:w-auto">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Crear Solicitud de Asistencia
                </Button>
            </div>
          </div>

          <div className="relative">
             {isPending && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {isMobile ? (
                <div className="space-y-4">
                     {filteredEntriesForTable.length > 0 ? (
                        filteredEntriesForTable.map((entry) => <MobileAttendanceCard key={entry.id} entry={entry} />)
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                             {(attendance[formattedDate] || []).length === 0 
                                ? "No hay cuadrillas asignadas para este día."
                                : "No se encontraron cuadrillas con el filtro aplicado."
                            }
                        </div>
                    )}
                </div>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cuadrilla</TableHead>
                          <TableHead>Proyecto</TableHead>
                          <TableHead>Responsable</TableHead>
                          <TableHead>Fecha de Envío</TableHead>
                          <TableHead className="text-center w-[150px]">Enviado</TableHead>
                          <TableHead className="text-right w-[100px]">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEntriesForTable.length > 0 ? (
                          filteredEntriesForTable.map((entry) => {
                            const crew = crewMap.get(entry.crewId);
                             if (!crew) return null;

                            return (
                              <TableRow key={entry.id}>
                                <TableCell className="font-medium">{crew.name}</TableCell>
                                <TableCell>{projectNameMap[crew.projectId] || 'N/A'}</TableCell>
                                <TableCell>{employeeNameMap[entry.responsibleId ?? ''] || 'N/A'}</TableCell>
                                <TableCell>
                                  {entry.sentAt ? format(new Date(entry.sentAt), 'Pp', { locale: es }) : "Pendiente"}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Switch
                                    checked={entry.sent}
                                    onCheckedChange={(checked) => handleUpdateSentStatus(entry.id, checked)}
                                    disabled={isPending}
                                    aria-label={`Marcar asistencia para ${crew.name}`}
                                  />
                                </TableCell>
                                 <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() => setRequestToDelete(entry)}
                                    disabled={isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Eliminar solicitud</span>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                              {(attendance[formattedDate] || []).length === 0 
                                ? "No hay cuadrillas asignadas para este día."
                                : "No se encontraron cuadrillas con el filtro aplicado."
                              }
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Solicitud de Asistencia</DialogTitle>
            <DialogDescription>
              Seleccione el proyecto, luego la cuadrilla y finalmente asigne un responsable.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="request-project">Proyecto</Label>
                <Select
                    value={newRequestState.projectId}
                    onValueChange={(value) => setNewRequestState(prev => ({ ...prev, projectId: value, crewId: "" }))}
                    disabled={isPending}
                >
                    <SelectTrigger id="request-project">
                        <SelectValue placeholder="Seleccione un proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                        {initialProjects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                                {project.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-crew">Cuadrilla</Label>
              <Combobox
                    options={availableCrewOptionsForRequest}
                    value={newRequestState.crewId}
                    onValueChange={(value) => setNewRequestState(prev => ({ ...prev, crewId: value }))}
                    placeholder="Seleccione una cuadrilla"
                    searchPlaceholder="Buscar cuadrilla..."
                    emptyMessage="No hay cuadrillas para este proyecto."
                    disabled={isPending || !newRequestState.projectId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-responsible">Responsable del Envío</Label>
              <Combobox
                options={employeeOptions}
                value={newRequestState.responsibleId}
                onValueChange={(value) => setNewRequestState(prev => ({ ...prev, responsibleId: value }))}
                placeholder="Seleccione un empleado"
                searchPlaceholder="Buscar por nombre, legajo o CUIL..."
                emptyMessage="No se encontró el empleado."
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>Cancelar</Button></DialogClose>
            <Button type="submit" onClick={handleAddRequest} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Solicitud de Asistencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Clonar lista del día anterior?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción reemplazará la lista de cuadrillas de hoy ({displayDate}) con la lista de cuadrillas y responsables del día anterior. Todos los estados de asistencia se reiniciarán a "no enviado". ¿Desea continuar?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsCloneDialogOpen(false)} disabled={isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleCloneDay} disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, clonar"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!requestToDelete} onOpenChange={(open) => !open && setRequestToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar solicitud de asistencia?</AlertDialogTitle>
                <AlertDialogDescription>
                   Esta acción no se puede deshacer. Se eliminará permanentemente la solicitud para la cuadrilla "{requestToDelete && crewMap.get(requestToDelete.crewId)?.name}" a cargo de "{requestToDelete && employeeNameMap[requestToDelete.responsibleId || '']}".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRequestToDelete(null)} disabled={isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteRequest} 
                  disabled={isPending}
                  className={buttonVariants({ variant: "destructive" })}
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, eliminar"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    
