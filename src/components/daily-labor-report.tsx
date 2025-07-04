
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Loader2, Save, UserPlus, Trash2, AlertTriangle } from "lucide-react";
import { format, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import type { Crew, Employee, DailyLaborData, Obra, AbsenceReason } from "@/types";
import { absenceReasons } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { saveDailyLabor } from "@/app/actions";
import { cn } from "@/lib/utils";

interface DailyLaborReportProps {
  initialCrews: Crew[];
  initialEmployees: Employee[];
  initialLaborData: DailyLaborData;
  initialObras: Obra[];
}

interface LaborEntryState {
    hours: number | null;
    absenceReason: AbsenceReason | null;
    horasAltura: number | null;
    horasHormigon: number | null;
    horasNocturnas: number | null;
}

export default function DailyLaborReport({ initialCrews, initialEmployees, initialLaborData, initialObras }: DailyLaborReportProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [laborData, setLaborData] = useState<DailyLaborData>(initialLaborData);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedObraId, setSelectedObraId] = useState<string>("");
  const [selectedCrewId, setSelectedCrewId] = useState<string>("");
  const [laborEntries, setLaborEntries] = useState<Record<string, LaborEntryState>>({});
  
  const [manualEmployeeIds, setManualEmployeeIds] = useState<string[]>([]);
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [employeeToAdd, setEmployeeToAdd] = useState("");


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

  const obrasWithCrews = useMemo(() => {
    const obraIdsWithCrews = new Set(initialCrews.map(crew => crew.obraId));
    return initialObras.filter(obra => obraIdsWithCrews.has(obra.id));
  }, [initialCrews, initialObras]);
  
  const crewsForSelectedObra = useMemo(() => {
    if (!selectedObraId) return [];
    return initialCrews.filter(c => c.obraId === selectedObraId);
  }, [initialCrews, selectedObraId]);

  const selectedCrew = useMemo(() => {
    return initialCrews.find(c => c.id === selectedCrewId);
  }, [initialCrews, selectedCrewId]);

  const personnelForSelectedCrew = useMemo(() => {
    if (!selectedCrew) return [];
    return (selectedCrew.employeeIds || []).map(id => employeeMap.get(id)).filter(Boolean) as Employee[];
  }, [selectedCrew, employeeMap]);

  const manuallyAddedPersonnel = useMemo(() => {
    return manualEmployeeIds.map(id => employeeMap.get(id)).filter(Boolean) as Employee[];
  }, [manualEmployeeIds, employeeMap]);

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
    return initialEmployees
      .filter(emp => 
        emp.condicion === 'jornal' && 
        emp.estado === 'activo' &&
        !crewMemberIds.has(emp.id) && 
        !manualEmployeeIds.includes(emp.id)
      )
      .map(emp => ({ value: emp.id, label: `${emp.apellido}, ${emp.nombre} (L: ${emp.legajo})` }));
  }, [initialEmployees, selectedCrew, manualEmployeeIds]);


  useEffect(() => {
    if (formattedDate && selectedCrewId) {
      const dailyEntries = laborData[formattedDate] || [];
      const crewEntries = dailyEntries.filter(entry => entry.crewId === selectedCrewId);
      
      const initialManualIds = crewEntries.filter(e => e.manual).map(e => e.employeeId);
      setManualEmployeeIds(initialManualIds);

      const crewMemberIds = selectedCrew?.employeeIds || [];
      const allIdsForCrew = new Set([...crewMemberIds, ...initialManualIds]);
      
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
      setManualEmployeeIds([]);
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

    const laborDataToSave = allPersonnelForTable.map(emp => {
      const entry = laborEntries[emp.id] || {};
      return {
        employeeId: emp.id,
        hours: entry.hours ?? null,
        absenceReason: entry.absenceReason ?? null,
        horasAltura: entry.horasAltura ?? null,
        horasHormigon: entry.horasHormigon ?? null,
        horasNocturnas: entry.horasNocturnas ?? null,
        manual: manualEmployeeIds.includes(emp.id),
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

  const handleAddManualEmployee = () => {
    if (employeeToAdd) {
        setManualEmployeeIds(prev => [...prev, employeeToAdd]);
        setLaborEntries(prev => ({
            ...prev,
            [employeeToAdd]: { hours: null, absenceReason: null, horasAltura: null, horasHormigon: null, horasNocturnas: null }
        }));
        setEmployeeToAdd("");
        setIsAddEmployeeDialogOpen(false);
    }
  };

  const handleRemoveManualEmployee = (employeeId: string) => {
    setManualEmployeeIds(prev => prev.filter(id => id !== employeeId));
    setLaborEntries(prev => {
        const newEntries = { ...prev };
        delete newEntries[employeeId];
        return newEntries;
    });
  };


  useEffect(() => {
    setSelectedCrewId("");
    setLaborEntries({});
    setManualEmployeeIds([]);
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
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allPersonnelForTable.length > 0 ? (
                    allPersonnelForTable.map(emp => {
                      const entry = laborEntries[emp.id] || { hours: null, absenceReason: null, horasAltura: null, horasHormigon: null, horasNocturnas: null };
                      const hasHours = entry.hours !== null && entry.hours > 0;
                      const isManual = manualEmployeeIds.includes(emp.id);

                      return (
                      <TableRow key={emp.id} className={isManual ? "bg-accent/50" : ""}>
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
                                  <p>Empleado agregado manualmente</p>
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
                          {isManual && (
                             <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveManualEmployee(emp.id)}
                                disabled={isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Quitar empleado</span>
                              </Button>
                          )}
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
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setIsAddEmployeeDialogOpen(true)} disabled={isPending}>
                <UserPlus className="mr-2 h-4 w-4" />
                Agregar Empleado
              </Button>
              <Button onClick={handleSave} disabled={isPending || allPersonnelForTable.length === 0}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Parte
              </Button>
            </div>
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
            Seleccione un empleado para agregarlo a este parte diario.
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
          <Button onClick={handleAddManualEmployee} disabled={!employeeToAdd}>Agregar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
}
