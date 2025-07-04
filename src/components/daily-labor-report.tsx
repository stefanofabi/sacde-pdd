
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
import type { Crew, Employee, DailyLaborData, Obra } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { saveDailyLabor } from "@/app/actions";

interface DailyLaborReportProps {
  initialCrews: Crew[];
  initialEmployees: Employee[];
  initialLaborData: DailyLaborData;
  initialObras: Obra[];
}

export default function DailyLaborReport({ initialCrews, initialEmployees, initialLaborData, initialObras }: DailyLaborReportProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [laborData, setLaborData] = useState<DailyLaborData>(initialLaborData);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedObraId, setSelectedObraId] = useState<string>("");
  const [selectedCrewId, setSelectedCrewId] = useState<string>("");
  const [hours, setHours] = useState<Record<string, number | null>>({});

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
      
      const initialHours: Record<string, number | null> = {};
      personnelForSelectedCrew.forEach(emp => {
        const entry = crewEntries.find(e => e.employeeId === emp.id);
        initialHours[emp.id] = entry ? entry.hours : null;
      });
      setHours(initialHours);
    } else {
      setHours({});
    }
  }, [formattedDate, selectedCrewId, laborData, personnelForSelectedCrew]);

  const handleHoursChange = (employeeId: string, value: string) => {
    const newHours = value === "" ? null : parseFloat(value);
    if (value === "" || (!isNaN(newHours) && newHours >= 0)) {
      setHours(prev => ({ ...prev, [employeeId]: newHours }));
    }
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

    const laborDataToSave = Object.entries(hours).map(([employeeId, h]) => ({
      employeeId,
      hours: h,
    }));

    startTransition(async () => {
      try {
        await saveDailyLabor(formattedDate, selectedCrewId, laborDataToSave);

        const dailyEntries = laborData[formattedDate] || [];
        const otherCrewEntries = dailyEntries.filter(entry => entry.crewId !== selectedCrewId);
        const newCrewEntries = laborDataToSave
            .filter(d => d.hours !== null && d.hours > 0)
            .map(d => ({
                id: crypto.randomUUID(),
                employeeId: d.employeeId,
                crewId: selectedCrewId,
                hours: d.hours!,
            }));
        
        setLaborData(prev => ({
            ...prev,
            [formattedDate]: [...otherCrewEntries, ...newCrewEntries]
        }));
        
        toast({
          title: "Datos Guardados",
          description: "Las horas se han registrado correctamente.",
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
  }, [selectedObraId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Carga de Horas por Empleado</CardTitle>
        <CardDescription>
          Seleccione fecha, obra y cuadrilla para registrar las horas trabajadas.
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
                    <TableHead className="w-[150px] text-right">Horas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personnelForSelectedCrew.length > 0 ? (
                    personnelForSelectedCrew.map(emp => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-mono">{emp.legajo}</TableCell>
                        <TableCell className="font-medium">{`${emp.apellido}, ${emp.nombre}`}</TableCell>
                        <TableCell>{emp.denominacionPosicion}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            className="text-right"
                            placeholder="0"
                            value={hours[emp.id] ?? ""}
                            onChange={(e) => handleHoursChange(emp.id, e.target.value)}
                            disabled={isPending}
                            step="0.5"
                            min="0"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
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
