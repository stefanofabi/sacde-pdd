
"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
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
} from "lucide-react";
import { format, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import type { Crew, AttendanceData, Obra, Employee, AttendanceEntry } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addAttendanceRequest, updateAttendanceSentStatus, clonePreviousDayAttendance } from "@/app/actions";

interface AttendanceTrackerProps {
  initialCrews: Crew[];
  initialAttendance: AttendanceData;
  initialObras: Obra[];
  initialEmployees: Employee[];
}

export default function AttendanceTracker({ initialCrews, initialAttendance, initialObras, initialEmployees }: AttendanceTrackerProps) {
  const { toast } = useToast();
  const [allCrews, setAllCrews] = useState<Crew[]>(initialCrews);
  const [attendance, setAttendance] = useState<AttendanceData>(initialAttendance);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [sentStatusFilter, setSentStatusFilter] = useState<"all" | "sent" | "not-sent">("all");
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  
  const [newRequestState, setNewRequestState] = useState({ obraId: "", crewId: "", responsibleId: "" });
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

  const obraNameMap = useMemo(() => {
    return Object.fromEntries(initialObras.map(obra => [obra.id, obra.name]));
  }, [initialObras]);

  const employeeNameMap = useMemo(() => {
    return Object.fromEntries(initialEmployees.map(emp => [emp.id, `${emp.nombre} ${emp.apellido}`]));
  }, [initialEmployees]);

  const employeeOptions = useMemo(() => {
    return initialEmployees.map(emp => ({
        value: emp.id,
        label: `${emp.nombre} ${emp.apellido} (L: ${emp.legajo}${emp.cuil ? `, C: ${emp.cuil}` : ''})`
    }));
  }, [initialEmployees]);
  
  const crewMap = useMemo(() => {
    return new Map(allCrews.map(crew => [crew.id, crew]));
  }, [allCrews]);

  const availableCrewsForRequest = useMemo(() => {
    if (!newRequestState.obraId) return [];
    return allCrews.filter(crew => crew.obraId === newRequestState.obraId);
  }, [allCrews, newRequestState.obraId]);
  
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
        (obraNameMap[crew.obraId] || '').toLowerCase().includes(lowerCaseSearchTerm) ||
        (responsibleName).toLowerCase().includes(lowerCaseSearchTerm)
    });
  }, [attendance, formattedDate, searchTerm, sentStatusFilter, crewMap, obraNameMap, employeeNameMap]);
  
  const handleUpdateSentStatus = (entryId: string, sent: boolean) => {
    if (!selectedDate) return;
    const dateKey = format(selectedDate, "yyyy-MM-dd");

    startTransition(async () => {
      try {
        const updatedEntry = await updateAttendanceSentStatus(dateKey, entryId, sent);
        setAttendance((prev) => {
           const newDailyData = (prev[dateKey] || []).map(e => e.id === entryId ? updatedEntry : e);
           return { ...prev, [dateKey]: newDailyData };
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar la asistencia.",
          variant: "destructive",
        });
      }
    });
  };

  const handleAddRequest = () => {
    if (!selectedDate || !newRequestState.obraId || !newRequestState.crewId || !newRequestState.responsibleId) {
      toast({
        title: "Error de validación",
        description: "Debe seleccionar una obra, una cuadrilla y un responsable.",
        variant: "destructive",
      });
      return;
    }
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    
    startTransition(async () => {
      try {
        const newEntry = await addAttendanceRequest(dateKey, newRequestState.crewId, newRequestState.responsibleId);
        setAttendance(prev => {
            const currentEntries = prev[dateKey] || [];
            return {
                ...prev,
                [dateKey]: [...currentEntries, newEntry]
            };
        });
        setNewRequestState({ obraId: "", crewId: "", responsibleId: "" });
        setIsRequestDialogOpen(false);
        toast({
          title: "Solicitud creada",
          description: `La cuadrilla ha sido añadida al parte del día.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "No se pudo agregar la solicitud.",
          variant: "destructive",
        });
      }
    });
  };

  const handleCloneDay = () => {
      if (!selectedDate) return;
      const dateKey = format(selectedDate, "yyyy-MM-dd");
      startTransition(async () => {
        try {
            const newAttendance = await clonePreviousDayAttendance(dateKey);
            setAttendance(newAttendance);
            setIsCloneDialogOpen(false);
            toast({
                title: "Día clonado",
                description: `Se clonó la lista de cuadrillas y responsables del día anterior. Todos los estados se reiniciaron a 'no enviado'.`,
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
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-[280px] justify-start text-left font-normal"
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
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cuadrilla, obra, responsable..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sentStatusFilter} onValueChange={(value: "all" | "sent" | "not-sent") => setSentStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="sent">Enviados</SelectItem>
                  <SelectItem value="not-sent">No Enviados</SelectItem>
                </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
                <Button onClick={() => setIsCloneDialogOpen(true)} variant="outline">
                    <Copy className="mr-2 h-4 w-4" />
                    Clonar Día Anterior
                </Button>
                <Button onClick={() => { setNewRequestState({ obraId: "", crewId: "", responsibleId: "" }); setIsRequestDialogOpen(true); }}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Crear Solicitud de Asistencia
                </Button>
            </div>
          </div>

          <div className="rounded-lg border relative">
             {isPending && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuadrilla</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Fecha de Envío</TableHead>
                  <TableHead className="text-center w-[150px]">Enviado</TableHead>
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
                        <TableCell>{obraNameMap[crew.obraId] || 'N/A'}</TableCell>
                        <TableCell>{employeeNameMap[entry.responsibleId ?? ''] || 'N/A'}</TableCell>
                        <TableCell>
                          {entry.sentAt ? format(new Date(entry.sentAt), 'Pp', { locale: es }) : 'Pendiente'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={entry.sent}
                            onCheckedChange={(checked) => handleUpdateSentStatus(entry.id, checked)}
                            disabled={isPending}
                            aria-label={`Marcar asistencia para ${crew.name}`}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
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
        </CardContent>
      </Card>

      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Solicitud de Asistencia</DialogTitle>
            <DialogDescription>
              Seleccione la obra, luego la cuadrilla y finalmente asigne un responsable.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="request-obra">Obra</Label>
                <Select
                    value={newRequestState.obraId}
                    onValueChange={(value) => setNewRequestState(prev => ({ ...prev, obraId: value, crewId: "" }))}
                    disabled={isPending}
                >
                    <SelectTrigger id="request-obra">
                        <SelectValue placeholder="Seleccione una obra" />
                    </SelectTrigger>
                    <SelectContent>
                        {initialObras.map((obra) => (
                            <SelectItem key={obra.id} value={obra.id}>
                                {obra.name}
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
                    emptyMessage="No hay cuadrillas para esta obra."
                    disabled={isPending || !newRequestState.obraId}
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
              Crear Solicitud
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
    </>
  );
}
