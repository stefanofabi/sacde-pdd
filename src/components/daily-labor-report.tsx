
"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Loader2, Save, UserPlus, Trash2, AlertTriangle, Send, Info, ArrowRightLeft } from "lucide-react";
import { format, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import type { Crew, Employee, DailyLaborData, Obra, AbsenceReason, DailyLaborNotificationData, DailyLaborEntry } from "@/types";
import { absenceReasons } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { saveDailyLabor, notifyDailyLabor, moveEmployeeBetweenCrews } from "@/app/actions";
import { cn } from "@/lib/utils";

interface DailyLaborReportProps {
  initialCrews: Crew[];
  initialEmployees: Employee[];
  initialLaborData: DailyLaborData;
  initialObras: Obra[];
  initialNotificationData: DailyLaborNotificationData;
}

interface LaborEntryState {
    hours: number | null;
    absenceReason: AbsenceReason | null;
    horasAltura: number | null;
    horasHormigon: number | null;
    horasNocturnas: number | null;
}

export default function DailyLaborReport({ initialCrews, initialEmployees, initialLaborData, initialObras, initialNotificationData }: DailyLaborReportProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [laborData, setLaborData] = useState<DailyLaborData>(initialLaborData);
  const [notificationData, setNotificationData] = useState<DailyLaborNotificationData>(initialNotificationData);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedObraId, setSelectedObraId] = useState<string>("");
  const [selectedCrewId, setSelectedCrewId] = useState<string>("");
  const [laborEntries, setLaborEntries] = useState<Record<string, LaborEntryState>>({});
  
  const [manualEmployeeIds, setManualEmployeeIds] = useState<string[]>([]);
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [employeeToAdd, setEmployeeToAdd] = useState("");
  const [employeeToMove, setEmployeeToMove] = useState<Employee | null>(null);
  const [destinationCrewId, setDestinationCrewId] = useState<string>("");


  useEffect(() => {
    if (typeof window !== "undefined") {
      setSelectedDate(startOfToday());
    }
  }, []);

  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const displayDate = selectedDate
    ? format(selectedDate, "PPP", { locale: es })
    : "Seleccione una fecha";

  const employeeMap = useMemo(() => new Map(initialEmployees.map(emp => [emp.id, emp])), [initialEmployees]);
  const obraMap = useMemo(() => new Map(initialObras.map(o => [o.id, o.name])), [initialObras]);

  const obrasWithCrews = useMemo(() => {
    const obraIdsWithCrews = new Set(initialCrews.map(crew => crew.obraId));
    return initialObras.filter(obra => obraIdsWithCrews.has(obra.id));
  }, [initialCrews, initialObras]);
  
  const crewsForSelectedObra = useMemo(() => {
    if (!selectedObraId) return [];
    return initialCrews.filter(c => c.obraId === selectedObraId);
  }, [initialCrews, selectedObraId]);

  const availableCrewsForMove = useMemo(() => {
    return initialCrews
        .filter(c => 
            c.id !== selectedCrewId && 
            !notificationData[formattedDate]?.[c.id]?.notified
        )
        .map(c => ({ value: c.id, label: `${c.name} (${obraMap.get(c.obraId) || 'Sin Obra'})` }));
  }, [initialCrews, selectedCrewId, notificationData, formattedDate, obraMap]);

  const selectedCrew = useMemo(() => {
    return initialCrews.find(c => c.id === selectedCrewId);
  }, [initialCrews, selectedCrewId]);

  const personnelForSelectedCrew = useMemo(() => {
    if (!selectedCrew) return [];
    return (selectedCrew.employeeIds || []).map(id => employeeMap.get(id)).filter(Boolean) as Employee[];
  }, [selectedCrew, employeeMap]);

  const manuallyAddedPersonnel = useMemo(() => {
    const dailyEntries = laborData[formattedDate] || [];
    const manualIdsForCrew = dailyEntries
      .filter(e => e.crewId === selectedCrewId && e.manual)
      .map(e => e.employeeId);
    return manualIdsForCrew.map(id => employeeMap.get(id)).filter(Boolean) as Employee[];
  }, [laborData, formattedDate, selectedCrewId, employeeMap]);

  const allPersonnelForTable = useMemo(() => {
    const combined = [...personnelForSelectedCrew, ...manuallyAddedPersonnel];
    const uniqueIds = new Set<string>();
    return combined.filter(emp => {
      if (uniqueIds.has(emp.id)) {
        return false;
      }
      uniqueIds.add(emp.id);
      return true;
    }).sort((a,b) => a.apellido.localeCompare(b.apellido));
  }, [personnelForSelectedCrew, manuallyAddedPersonnel]);

  const availableEmployeesForManualAdd = useMemo(() => {
    const crewMemberIds = new Set(selectedCrew?.employeeIds || []);
    const manuallyAddedIds = new Set(manuallyAddedPersonnel.map(e => e.id));

    return initialEmployees
      .filter(emp => 
        emp.condicion === 'jornal' && 
        emp.estado === 'activo' &&
        !crewMemberIds.has(emp.id) && 
        !manuallyAddedIds.has(emp.id)
      )
      .map(emp => ({ value: emp.id, label: `${emp.apellido}, ${emp.nombre} (L: ${emp.legajo})` }));
  }, [initialEmployees, selectedCrew, manuallyAddedPersonnel]);

  const { isNotified, notifiedAt } = useMemo(() => {
    const status = notificationData[formattedDate]?.[selectedCrewId];
    return {
      isNotified: status?.notified || false,
      notifiedAt: status?.notifiedAt ? format(new Date(status.notifiedAt), 'Pp', { locale: es }) : null,
    }
  }, [notificationData, formattedDate, selectedCrewId]);

  const employeeAssignmentStatus = useMemo(() => {
    const allEntriesForDate = laborData[formattedDate] || [];
    
    const otherCrewsEntries = allEntriesForDate.filter(entry => entry.crewId !== selectedCrewId);

    const currentCrewUnsavedEntries = allPersonnelForTable.map(emp => ({
        employeeId: emp.id,
        crewId: selectedCrewId,
        ...(laborEntries[emp.id] || {}),
    }));

    const mergedEntries = [...otherCrewsEntries, ...currentCrewUnsavedEntries];

    const statusMap = new Map<string, { hasHours: boolean; hasAbsence: boolean; totalHours: number }>();
    for (const entry of mergedEntries) {
        if (!entry.employeeId) continue;
        const currentStatus = statusMap.get(entry.employeeId) || { hasHours: false, hasAbsence: false, totalHours: 0 };
        if (entry.hours && entry.hours > 0) {
            currentStatus.hasHours = true;
            currentStatus.totalHours += entry.hours;
        }
        if (entry.absenceReason) {
            currentStatus.hasAbsence = true;
        }
        statusMap.set(entry.employeeId, currentStatus);
    }
    return statusMap;
}, [laborData, formattedDate, selectedCrewId, allPersonnelForTable, laborEntries]);

  useEffect(() => {
    if (formattedDate && selectedCrewId) {
      const dailyEntries = laborData[formattedDate] || [];
      const crewEntries = dailyEntries.filter(entry => entry.crewId === selectedCrewId);
      
      const crewMemberIds = selectedCrew?.employeeIds || [];
      const manualIds = crewEntries.filter(e => e.manual).map(e => e.employeeId);
      const allIdsForCrew = new Set([...crewMemberIds, ...manualIds]);
      
      const initialEntries: Record<string, LaborEntryState> = {};
      
      allIdsForCrew.forEach(empId => {
          const entry = crewEntries.find(e => e.employeeId === empId);
          initialEntries[empId] = {
              hours: entry?.hours ?? null,
              absenceReason: entry?.absenceReason ?? null,
              horasAltura: entry?.horasAltura ?? null,
              horasHormigon: entry?.horasHormigon ?? null,
              horasNocturnas: entry?.horasNocturnas ?? null,
          }
      });
      setLaborEntries(initialEntries);
    } else {
      setLaborEntries({});
    }
  }, [formattedDate, selectedCrewId, laborData, selectedCrew]);

  const handleEntryChange = (
      employeeId: string, 
      field: keyof LaborEntryState, 
      value: string | null
    ) => {
    setLaborEntries(prev => {
        const currentEntry = prev[employeeId] || { hours: null, absenceReason: null, horasAltura: null, horasHormigon: null, horasNocturnas: null };
        let newEntry = { ...currentEntry };

        const parseNumericValue = (val: string | null) => {
            if (val === "" || val === null) return null;
            const num = parseFloat(val);
            return isNaN(num) ? null : num;
        }

        if (field === 'hours') {
            const newHours = parseNumericValue(value);
            newEntry.hours = newHours !== null && newHours > 0 ? newHours : null;
            if (newHours !== null && newHours > 0) {
                newEntry.absenceReason = null;
            } else {
                newEntry.hours = null;
                newEntry.horasAltura = null;
                newEntry.horasHormigon = null;
                newEntry.horasNocturnas = null;
            }
        } else if (field === 'absenceReason') {
            newEntry.absenceReason = value === 'NONE' ? null : value as AbsenceReason | null;
            if (value !== 'NONE' && value !== null) {
                newEntry.hours = null;
                newEntry.horasAltura = null;
                newEntry.horasHormigon = null;
                newEntry.horasNocturnas = null;
            }
        } else if (field === 'horasAltura' || field === 'horasHormigon' || field === 'horasNocturnas') {
            let newSpecialHours = parseNumericValue(value);
            if (newSpecialHours !== null && newSpecialHours > 0) {
                if (newEntry.hours !== null && newSpecialHours > newEntry.hours) {
                    newSpecialHours = newEntry.hours;
                }
            } else {
                newSpecialHours = null;
            }
            newEntry[field] = newSpecialHours;
        }
        
        return { ...prev, [employeeId]: newEntry };
    });
  };

  const handleSave = () => {
    if (!formattedDate || !selectedCrewId) {
      toast({
        title: "Selección requerida",
        description: "Por favor, seleccione una fecha y una cuadrilla para guardar.",
        variant: "destructive",
      });
      return;
    }

    const manualIds = (laborData[formattedDate] || []).filter(e => e.crewId === selectedCrewId && e.manual).map(e => e.employeeId);

    const laborDataToSave = allPersonnelForTable.map(emp => {
      const entry = laborEntries[emp.id] || {};
      const isManual = !selectedCrew?.employeeIds.includes(emp.id) || manualIds.includes(emp.id);
      return {
        employeeId: emp.id,
        hours: entry.hours ?? null,
        absenceReason: entry.absenceReason ?? null,
        horasAltura: entry.horasAltura ?? null,
        horasHormigon: entry.horasHormigon ?? null,
        horasNocturnas: entry.horasNocturnas ?? null,
        manual: isManual,
      };
    });

    startTransition(async () => {
      try {
        await saveDailyLabor(formattedDate, selectedCrewId, laborDataToSave);

        const dailyEntries = laborData[formattedDate] || [];
        const otherCrewEntries = dailyEntries.filter(entry => entry.crewId !== selectedCrewId);
        const newCrewEntries = laborDataToSave
            .filter(d => (d.hours !== null && d.hours > 0) || d.absenceReason || d.manual)
            .map(d => ({
                id: crypto.randomUUID(),
                employeeId: d.employeeId,
                crewId: selectedCrewId,
                hours: d.hours,
                absenceReason: d.absenceReason,
                horasAltura: d.horasAltura,
                horasHormigon: d.horasHormigon,
                horasNocturnas: d.horasNocturnas,
                manual: d.manual
            }));
        
        setLaborData(prev => ({
            ...prev,
            [formattedDate]: [...otherCrewEntries, ...newCrewEntries]
        }));
        
        toast({
          title: "Datos Guardados",
          description: "Las horas y ausencias se han registrado correctamente.",
        });
      } catch (error) {
        toast({
          title: "Error al Guardar",
          description: "No se pudieron guardar los datos.",
          variant: "destructive",
        });
      }
    });
  };

  const handleNotify = () => {
    if (!formattedDate || !selectedCrewId) return;

    startTransition(async () => {
        try {
            await notifyDailyLabor(formattedDate, selectedCrewId);
            setNotificationData(prev => ({
                ...prev,
                [formattedDate]: {
                    ...(prev[formattedDate] || {}),
                    [selectedCrewId]: {
                        notified: true,
                        notifiedAt: new Date().toISOString()
                    }
                }
            }));
            setIsNotifyDialogOpen(false);
            toast({
                title: "Parte Notificado",
                description: "El parte diario se ha notificado y ya no se puede modificar.",
            });
        } catch (error) {
            toast({
                title: "Error al Notificar",
                description: "No se pudo notificar el parte.",
                variant: "destructive",
            });
        }
    });
  };

  const handleOpenNotifyDialog = () => {
    if (!selectedCrewId || !allPersonnelForTable) {
        toast({
            title: "Error",
            description: "Debe seleccionar una cuadrilla con personal para notificar.",
            variant: "destructive"
        });
        return;
    }

    const personnelWithoutNovelty = allPersonnelForTable.filter(emp => {
        const entry = laborEntries[emp.id];
        const hasHours = entry && entry.hours && entry.hours > 0;
        const hasAbsence = entry && entry.absenceReason;
        return !hasHours && !hasAbsence;
    });

    if (personnelWithoutNovelty.length > 0) {
        const employeeNames = personnelWithoutNovelty
            .map(emp => `${emp.apellido}, ${emp.nombre}`)
            .join('; ');
        toast({
            title: "Faltan Novedades para Notificar",
            description: `Los siguientes empleados no tienen horas ni ausencias registradas: ${employeeNames}.`,
            variant: "destructive",
            duration: 8000
        });
        return;
    }

    setIsNotifyDialogOpen(true);
  };
  
  const handleOpenMoveDialog = (employee: Employee) => {
    setEmployeeToMove(employee);
    setDestinationCrewId(""); 
  };

  const handleMoveEmployee = () => {
    if (!employeeToMove || !destinationCrewId || !selectedCrewId || !formattedDate) return;
    
    startTransition(async () => {
        try {
            await moveEmployeeBetweenCrews(formattedDate, employeeToMove.id, selectedCrewId, destinationCrewId);

            setLaborData(prev => {
                const dateEntries = prev[formattedDate] || [];
                const updatedEntries = dateEntries.filter(e => !(e.crewId === selectedCrewId && e.employeeId === employeeToMove.id));
                const newEntry: DailyLaborEntry = {
                    id: crypto.randomUUID(),
                    employeeId: employeeToMove.id,
                    crewId: destinationCrewId,
                    hours: null,
                    absenceReason: null,
                    horasAltura: null,
                    horasHormigon: null,
                    horasNocturnas: null,
                    manual: true
                };
                return {
                    ...prev,
                    [formattedDate]: [...updatedEntries, newEntry]
                };
            });
            
            toast({
                title: "Empleado Movido",
                description: `${employeeToMove.apellido}, ${employeeToMove.nombre} ha sido movido con éxito.`,
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

  const handleAddManualEmployee = () => {
    if (employeeToAdd) {
        startTransition(async () => {
            const laborDataToSave = [{
                employeeId: employeeToAdd,
                hours: null,
                absenceReason: null,
                manual: true,
            }];
            await saveDailyLabor(formattedDate, selectedCrewId, laborDataToSave);
            
            const newEntry: DailyLaborEntry = {
                id: crypto.randomUUID(),
                employeeId: employeeToAdd,
                crewId: selectedCrewId,
                hours: null,
                absenceReason: null,
                horasAltura: null,
                horasHormigon: null,
                horasNocturnas: null,
                manual: true
            };
            setLaborData(prev => ({
                ...prev,
                [formattedDate]: [...(prev[formattedDate] || []), newEntry]
            }));

            setEmployeeToAdd("");
            setIsAddEmployeeDialogOpen(false);
        });
    }
  };

  const handleRemoveManualEmployee = (employeeId: string) => {
    startTransition(async () => {
       await saveDailyLabor(formattedDate, selectedCrewId, [{ employeeId, hours: null, absenceReason: null, manual: false }]); // This will remove it
       setLaborData(prev => {
         const updatedEntries = (prev[formattedDate] || []).filter(e => !(e.crewId === selectedCrewId && e.employeeId === employeeId));
         return { ...prev, [formattedDate]: updatedEntries };
       });
    });
  };

  useEffect(() => {
    setSelectedCrewId("");
    setLaborEntries({});
  }, [selectedObraId]);

  return (
    <TooltipProvider>
    <Card>
      <CardHeader>
        <CardTitle>Carga de Horas por Empleado</CardTitle>
        <CardDescription>
          Seleccione fecha, obra y cuadrilla para registrar las horas o ausencias del personal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {displayDate}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus locale={es} disabled={(date) => date > new Date()} />
            </PopoverContent>
          </Popover>

          <Select value={selectedObraId} onValueChange={setSelectedObraId}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Seleccione una obra" />
            </SelectTrigger>
            <SelectContent>
              {obrasWithCrews.map(obra => (
                <SelectItem key={obra.id} value={obra.id}>{obra.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Combobox
            options={crewsForSelectedObra.map(c => ({ value: c.id, label: c.name }))}
            value={selectedCrewId}
            onValueChange={setSelectedCrewId}
            placeholder="Seleccione una cuadrilla"
            searchPlaceholder="Buscar cuadrilla..."
            emptyMessage="No hay cuadrillas para esta obra."
            disabled={!selectedObraId}
            className="w-full sm:w-[250px]"
          />
        </div>
        
        {selectedCrewId ? (
          <div>
            {isNotified && (
              <Alert className="mb-4 border-primary/50 text-primary [&>svg]:text-primary">
                <Info className="h-4 w-4" />
                <AlertTitle>Parte Notificado</AlertTitle>
                <AlertDescription>
                  Este parte fue notificado el {notifiedAt}. No se admiten más cambios.
                </AlertDescription>
              </Alert>
            )}
            <fieldset disabled={isNotified}>
                <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Legajo</TableHead>
                        <TableHead>Apellido y Nombre</TableHead>
                        <TableHead>Posición</TableHead>
                        <TableHead className="w-[120px] text-center">Horas</TableHead>
                        <TableHead className="w-[110px] text-center">H. Altura</TableHead>
                        <TableHead className="w-[110px] text-center">H. Hormigón</TableHead>
                        <TableHead className="w-[110px] text-center">H. Nocturnas</TableHead>
                        <TableHead className="w-[220px]">Ausencia</TableHead>
                        <TableHead className="w-[100px] text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {allPersonnelForTable.length > 0 ? (
                        allPersonnelForTable.map(emp => {
                        const entry = laborEntries[emp.id] || { hours: null, absenceReason: null, horasAltura: null, horasHormigon: null, horasNocturnas: null };
                        const hasHours = entry.hours !== null && entry.hours > 0;
                        const dailyEntries = laborData[formattedDate] || [];
                        const isManual = dailyEntries.some(e => e.crewId === selectedCrewId && e.employeeId === emp.id && e.manual);
                        
                        const assignmentStatus = employeeAssignmentStatus.get(emp.id);
                        const hasAbsenceConflict = assignmentStatus && assignmentStatus.hasHours && assignmentStatus.hasAbsence;
                        const totalHours = assignmentStatus?.totalHours || 0;
                        const hasOvertimeWarning = totalHours > 12;

                        const warningMessages = [];
                        if (hasAbsenceConflict) {
                            warningMessages.push("El empleado tiene horas y una ausencia registradas en el mismo día.");
                        }
                        if (hasOvertimeWarning) {
                            warningMessages.push(`El empleado suma un total de ${totalHours} horas en este día, superando el límite de 12.`);
                        }
                        
                        return (
                        <TableRow key={emp.id} className={cn(
                            isManual ? "bg-accent/50" : "",
                            warningMessages.length > 0 ? "bg-destructive/10" : ""
                        )}>
                            <TableCell className="font-mono">{emp.legajo}</TableCell>
                            <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                                {`${emp.apellido}, ${emp.nombre}`}
                                {isManual && (
                                <Tooltip>
                                    <TooltipTrigger>
                                    <UserPlus className="h-4 w-4 text-primary" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                    <p>Empleado agregado manually</p>
                                    </TooltipContent>
                                </Tooltip>
                                )}
                                {warningMessages.length > 0 && (
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <AlertTriangle className="h-4 w-4 text-destructive" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                        <div className="max-w-xs space-y-1">
                                            {warningMessages.map((msg, i) => <p key={i}>{msg}</p>)}
                                        </div>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
                            </TableCell>
                            <TableCell>{emp.denominacionPosicion}</TableCell>
                            <TableCell>
                            <div className="relative">
                                <Input
                                type="number"
                                className={cn(
                                    "text-center",
                                    entry.hours && entry.hours > 12
                                    ? "border-destructive text-destructive focus-visible:ring-destructive pr-8"
                                    : ""
                                )}
                                placeholder="-"
                                value={entry.hours ?? ""}
                                onChange={(e) => handleEntryChange(emp.id, 'hours', e.target.value)}
                                disabled={isPending || !!entry.absenceReason}
                                step="0.5"
                                min="0"
                                />
                                {entry.hours && entry.hours > 12 && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <Tooltip>
                                    <TooltipTrigger>
                                        <AlertTriangle className="h-4 w-4 text-destructive" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Advertencia: Más de 12 horas cargadas.</p>
                                    </TooltipContent>
                                    </Tooltip>
                                </div>
                                )}
                            </div>
                            </TableCell>
                            <TableCell>
                            <Input
                                type="number"
                                className="text-center"
                                placeholder="-"
                                value={entry.horasAltura ?? ""}
                                onChange={(e) => handleEntryChange(emp.id, 'horasAltura', e.target.value)}
                                disabled={isPending || !hasHours}
                                step="0.5"
                                min="0"
                                max={entry.hours || 0}
                            />
                            </TableCell>
                            <TableCell>
                            <Input
                                type="number"
                                className="text-center"
                                placeholder="-"
                                value={entry.horasHormigon ?? ""}
                                onChange={(e) => handleEntryChange(emp.id, 'horasHormigon', e.target.value)}
                                disabled={isPending || !hasHours}
                                step="0.5"
                                min="0"
                                max={entry.hours || 0}
                            />
                            </TableCell>
                            <TableCell>
                            <Input
                                type="number"
                                className="text-center"
                                placeholder="-"
                                value={entry.horasNocturnas ?? ""}
                                onChange={(e) => handleEntryChange(emp.id, 'horasNocturnas', e.target.value)}
                                disabled={isPending || !hasHours}
                                step="0.5"
                                min="0"
                                max={entry.hours || 0}
                            />
                            </TableCell>
                            <TableCell>
                            <Select
                                    value={entry.absenceReason ?? "NONE"}
                                    onValueChange={(value) => handleEntryChange(emp.id, 'absenceReason', value)}
                                    disabled={isPending || hasHours}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar motivo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NONE">-</SelectItem>
                                        {absenceReasons.map(reason => (
                                            <SelectItem key={reason.value} value={reason.value}>
                                                {reason.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleOpenMoveDialog(emp)}
                                        disabled={isPending}
                                    >
                                        <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                                        <span className="sr-only">Mover empleado</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p>Mover a otra cuadrilla</p>
                                  </TooltipContent>
                                </Tooltip>
                                {isManual && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveManualEmployee(emp.id)}
                                                disabled={isPending}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                <span className="sr-only">Quitar empleado</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Quitar de este parte</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                              </div>
                            </TableCell>
                        </TableRow>
                        )})
                    ) : (
                        <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                            Esta cuadrilla no tiene personal asignado.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </div>
                <div className="flex justify-between mt-4 p-4 border-t">
                <Button variant="outline" onClick={() => setIsAddEmployeeDialogOpen(true)} disabled={isPending}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Agregar Empleado
                </Button>
                <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isPending || !selectedCrewId}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Parte
                    </Button>
                    <Button onClick={handleOpenNotifyDialog} disabled={isPending || !selectedCrewId}>
                        <Send className="mr-2 h-4 w-4" />
                        Notificar Parte
                    </Button>
                </div>
                </div>
            </fieldset>
          </div>
        ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>Seleccione una obra y una cuadrilla para ver al personal.</p>
            </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Empleado Manualmente</DialogTitle>
          <DialogDescription>
            Seleccione un empleado para agregarlo a este parte diario. Solo se guardará cuando presione "Guardar Parte".
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="employee-to-add">Empleado</Label>
          <Combobox
            options={availableEmployeesForManualAdd}
            value={employeeToAdd}
            onValueChange={setEmployeeToAdd}
            placeholder="Seleccione un empleado"
            searchPlaceholder="Buscar por nombre o legajo..."
            emptyMessage="No hay más empleados disponibles."
          />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
          <Button onClick={handleAddManualEmployee} disabled={!employeeToAdd || isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    <Dialog open={!!employeeToMove} onOpenChange={(open) => !open && setEmployeeToMove(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Mover Empleado</DialogTitle>
                <DialogDescription>
                    Mover a <strong>{employeeToMove?.apellido}, {employeeToMove?.nombre}</strong> a otra cuadrilla para la fecha <strong>{displayDate}</strong>.
                    Esta acción quitará al empleado del parte actual y creará una entrada en blanco en el parte de destino.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="destination-crew">Cuadrilla de Destino</Label>
                <Select value={destinationCrewId} onValueChange={setDestinationCrewId}>
                    <SelectTrigger id="destination-crew">
                        <SelectValue placeholder="Seleccione una cuadrilla" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableCrewsForMove.length > 0 ? (
                            availableCrewsForMove.map(crew => (
                                <SelectItem key={crew.value} value={crew.value}>{crew.label}</SelectItem>
                            ))
                        ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No hay otras cuadrillas disponibles para mover.
                            </div>
                        )}
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

    <AlertDialog open={isNotifyDialogOpen} onOpenChange={setIsNotifyDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Notificar y cerrar el parte diario?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción es irreversible. Una vez notificado, el parte diario para la cuadrilla <strong>{selectedCrew?.name}</strong> en la fecha <strong>{displayDate}</strong> no podrá ser modificado. Asegúrese de que todos los datos son correctos.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsNotifyDialogOpen(false)} disabled={isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={handleNotify} 
                    disabled={isPending}
                    className={buttonVariants({ variant: "default" })}
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, notificar y cerrar"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </TooltipProvider>
  );
}
