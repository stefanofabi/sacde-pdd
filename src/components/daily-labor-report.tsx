
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
import { Combobox } from "@/components/ui/combobox";
import { Calendar as CalendarIcon, Loader2, Save } from "lucide-react";
import { format, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import type { Crew, Employee, DailyLaborData, Obra, AbsenceReason } from "@/types";
import { absenceReasons } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { saveDailyLabor } from "@/app/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface DailyLaborReportProps {
  initialCrews: Crew[];
  initialEmployees: Employee[];
  initialLaborData: DailyLaborData;
  initialObras: Obra[];
}

interface LaborEntryState {
    hours: number | null;
    absenceReason: AbsenceReason | null;
    isAltura: boolean;
    isHormigon: boolean;
    isNocturna: boolean;
}

export default function DailyLaborReport({ initialCrews, initialEmployees, initialLaborData, initialObras }: DailyLaborReportProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [laborData, setLaborData] = useState<DailyLaborData>(initialLaborData);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedObraId, setSelectedObraId] = useState<string>("");
  const [selectedCrewId, setSelectedCrewId] = useState<string>("");
  const [laborEntries, setLaborEntries] = useState<Record<string, LaborEntryState>>({});

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

  useEffect(() => {
    if (formattedDate && selectedCrewId) {
      const dailyEntries = laborData[formattedDate] || [];
      const crewEntries = dailyEntries.filter(entry => entry.crewId === selectedCrewId);
      
      const initialEntries: Record<string, LaborEntryState> = {};
      personnelForSelectedCrew.forEach(emp => {
        const entry = crewEntries.find(e => e.employeeId === emp.id);
        initialEntries[emp.id] = {
            hours: entry?.hours ?? null,
            absenceReason: entry?.absenceReason ?? null,
            isAltura: entry?.isAltura ?? false,
            isHormigon: entry?.isHormigon ?? false,
            isNocturna: entry?.isNocturna ?? false,
        }
      });
      setLaborEntries(initialEntries);
    } else {
      setLaborEntries({});
    }
  }, [formattedDate, selectedCrewId, laborData, personnelForSelectedCrew]);

  const handleEntryChange = (
      employeeId: string, 
      field: keyof LaborEntryState, 
      value: string | null | boolean
    ) => {
    setLaborEntries(prev => {
        const currentEntry = prev[employeeId] || { hours: null, absenceReason: null, isAltura: false, isHormigon: false, isNocturna: false };
        let newEntry = { ...currentEntry };

        if (field === 'hours') {
            const newHours = value === "" || value === null ? null : parseFloat(value as string);
            if (value === "" || value === null || !isNaN(newHours as number)) {
                newEntry.hours = newHours !== null && newHours > 0 ? newHours : null;
                if (newHours !== null && newHours > 0) {
                    newEntry.absenceReason = null;
                } else {
                    newEntry.hours = null;
                    newEntry.isAltura = false;
                    newEntry.isHormigon = false;
                    newEntry.isNocturna = false;
                }
            }
        } else if (field === 'absenceReason') {
            newEntry.absenceReason = value as AbsenceReason | null;
            if (value) {
                newEntry.hours = null;
                newEntry.isAltura = false;
                newEntry.isHormigon = false;
                newEntry.isNocturna = false;
            }
        } else if (field === 'isAltura' || field === 'isHormigon' || field === 'isNocturna') {
            newEntry[field] = value as boolean;
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

    const laborDataToSave = Object.entries(laborEntries).map(([employeeId, entry]) => ({
      employeeId,
      hours: entry.hours,
      absenceReason: entry.absenceReason,
      isAltura: entry.isAltura,
      isHormigon: entry.isHormigon,
      isNocturna: entry.isNocturna,
    }));

    startTransition(async () => {
      try {
        await saveDailyLabor(formattedDate, selectedCrewId, laborDataToSave);

        const dailyEntries = laborData[formattedDate] || [];
        const otherCrewEntries = dailyEntries.filter(entry => entry.crewId !== selectedCrewId);
        const newCrewEntries = laborDataToSave
            .filter(d => (d.hours !== null && d.hours > 0) || d.absenceReason)
            .map(d => ({
                id: crypto.randomUUID(),
                employeeId: d.employeeId,
                crewId: selectedCrewId,
                hours: d.hours,
                absenceReason: d.absenceReason,
                isAltura: d.isAltura,
                isHormigon: d.isHormigon,
                isNocturna: d.isNocturna,
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

  useEffect(() => {
    setSelectedCrewId("");
    setLaborEntries({});
  }, [selectedObraId]);

  return (
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
                    <TableHead className="w-[100px] text-center">Altura</TableHead>
                    <TableHead className="w-[100px] text-center">Hormigón</TableHead>
                    <TableHead className="w-[100px] text-center">Nocturnas</TableHead>
                    <TableHead className="w-[220px]">Ausencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personnelForSelectedCrew.length > 0 ? (
                    personnelForSelectedCrew.map(emp => {
                      const entry = laborEntries[emp.id] || { hours: null, absenceReason: null, isAltura: false, isHormigon: false, isNocturna: false };
                      const hasHours = entry.hours !== null && entry.hours > 0;
                      return (
                      <TableRow key={emp.id}>
                        <TableCell className="font-mono">{emp.legajo}</TableCell>
                        <TableCell className="font-medium">{`${emp.apellido}, ${emp.nombre}`}</TableCell>
                        <TableCell>{emp.denominacionPosicion}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="text-center"
                            placeholder="-"
                            value={entry.hours ?? ""}
                            onChange={(e) => handleEntryChange(emp.id, 'hours', e.target.value)}
                            disabled={isPending || !!entry.absenceReason}
                            step="0.5"
                            min="0"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            id={`altura-${emp.id}`}
                            checked={entry.isAltura}
                            onCheckedChange={(checked) => handleEntryChange(emp.id, 'isAltura', checked as boolean)}
                            disabled={isPending || !hasHours}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            id={`hormigon-${emp.id}`}
                            checked={entry.isHormigon}
                            onCheckedChange={(checked) => handleEntryChange(emp.id, 'isHormigon', checked as boolean)}
                            disabled={isPending || !hasHours}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            id={`nocturna-${emp.id}`}
                            checked={entry.isNocturna}
                            onCheckedChange={(checked) => handleEntryChange(emp.id, 'isNocturna', checked as boolean)}
                            disabled={isPending || !hasHours}
                          />
                        </TableCell>
                        <TableCell>
                           <Select
                                value={entry.absenceReason ?? "NONE"}
                                onValueChange={(value) => handleEntryChange(emp.id, 'absenceReason', value === 'NONE' ? null : value as AbsenceReason)}
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
                      </TableRow>
                    )})
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        Esta cuadrilla no tiene personal asignado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSave} disabled={isPending || personnelForSelectedCrew.length === 0}>
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
  );
}
