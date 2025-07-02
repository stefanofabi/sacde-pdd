"use client";

import { useState, useMemo, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar as CalendarIcon,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Search,
} from "lucide-react";
import { format, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import type { Crew } from "@/types";
import { useToast } from "@/hooks/use-toast";

const CREWS_STORAGE_KEY = "attendance-tracker-crews";
const ATTENDANCE_STORAGE_KEY = "attendance-tracker-attendance";

const initialCrews: Crew[] = [
  { id: "1", name: "Cuadrilla Alpha", responsible: "Juan Pérez" },
  { id: "2", name: "Equipo Bravo", responsible: "Maria García" },
  { id: "3", name: "Delta Force", responsible: "Carlos Rodriguez" },
  { id: "4", name: "Constructores del Sur", responsible: "Ana Martinez" },
];

export default function AttendanceTracker() {
  const { toast } = useToast();
  const [crews, setCrews] = useState<Crew[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Record<string, boolean>>>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "not-sent">("all");
  const [isAddCrewDialogOpen, setIsAddCrewDialogOpen] = useState(false);
  const [newCrewName, setNewCrewName] = useState("");
  const [newCrewResponsible, setNewCrewResponsible] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedCrews = localStorage.getItem(CREWS_STORAGE_KEY);
      if (storedCrews) {
        setCrews(JSON.parse(storedCrews));
      } else {
        setCrews(initialCrews);
      }

      const storedAttendance = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      const today = startOfToday();
      if (storedAttendance) {
        setAttendance(JSON.parse(storedAttendance));
      } else {
        const initialAttendance = {
          [format(today, "yyyy-MM-dd")]: { "1": true, "3": false, "2": true },
        };
        setAttendance(initialAttendance);
      }
      setSelectedDate(today);
    } catch (error) {
      console.error("Failed to parse data from localStorage", error);
      toast({
        title: "Error al cargar datos",
        description: "Restableciendo a los valores predeterminados.",
        variant: "destructive",
      });
      setCrews(initialCrews);
      const today = startOfToday();
      setAttendance({
        [format(today, "yyyy-MM-dd")]: { "1": true, "3": false, "2": true },
      });
      setSelectedDate(today);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(CREWS_STORAGE_KEY, JSON.stringify(crews));
    }
  }, [crews, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(attendance));
    }
  }, [attendance, isLoading]);

  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const displayDate = selectedDate
    ? format(selectedDate, "PPP", { locale: es })
    : "Seleccione una fecha";

  const filteredCrews = useMemo(() => {
    if (!selectedDate) return [];
    const dailyAttendance = attendance[formattedDate] || {};

    return crews.filter((crew) => {
      const hasSent = dailyAttendance[crew.id] ?? false;
      const matchesSearch =
        crew.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crew.responsible.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "sent" && hasSent) ||
        (statusFilter === "not-sent" && !hasSent);
      return matchesSearch && matchesStatus;
    });
  }, [crews, attendance, selectedDate, searchTerm, statusFilter, formattedDate]);

  const handleToggleAttendance = (crewId: string) => {
    if (!selectedDate) return;
    const dateKey = format(selectedDate, "yyyy-MM-dd");

    setAttendance((prev) => {
      const dailyAttendance = prev[dateKey] || {};
      const newDailyAttendance = {
        ...dailyAttendance,
        [crewId]: !dailyAttendance[crewId],
      };
      return {
        ...prev,
        [dateKey]: newDailyAttendance,
      };
    });
  };

  const handleAddCrew = () => {
    if (!newCrewName.trim() || !newCrewResponsible.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre y el responsable no pueden estar vacíos.",
        variant: "destructive",
      });
      return;
    }
    const newCrew: Crew = {
      id: crypto.randomUUID(),
      name: newCrewName,
      responsible: newCrewResponsible,
    };
    setCrews((prevCrews) => [...prevCrews, newCrew]);
    setNewCrewName("");
    setNewCrewResponsible("");
    setIsAddCrewDialogOpen(false);
    toast({
      title: "Cuadrilla agregada",
      description: `La cuadrilla "${newCrew.name}" ha sido creada.`,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando registros...</CardTitle>
          <CardDescription>Por favor espere.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <Skeleton className="h-10 w-full md:w-48" />
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-full md:w-40" />
              <Skeleton className="h-10 w-full md:w-48" />
            </div>
            <Skeleton className="h-[400px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Registro de Asistencia</CardTitle>
          <CardDescription>
            Seleccione una fecha y filtre para ver el estado de asistencia de las
            cuadrillas.
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
                  onSelect={(date) => {
                    setSelectedDate(date);
                    if (date) {
                      const dateKey = format(date, "yyyy-MM-dd");
                      if (!attendance[dateKey]) {
                        setAttendance(prev => ({...prev, [dateKey]: {}}));
                      }
                    }
                  }}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cuadrilla o responsable..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value: "all" | "sent" | "not-sent") =>
                setStatusFilter(value)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="not-sent">No Enviado</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setIsAddCrewDialogOpen(true)} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Agregar Cuadrilla
            </Button>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuadrilla</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead className="text-center">Envió Asistencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCrews.length > 0 ? (
                  filteredCrews.map((crew) => {
                    const hasSent = attendance[formattedDate]?.[crew.id] ?? false;
                    return (
                      <TableRow key={crew.id}>
                        <TableCell className="font-medium">{crew.name}</TableCell>
                        <TableCell>{crew.responsible}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-3">
                            <Switch
                              checked={hasSent}
                              onCheckedChange={() => handleToggleAttendance(crew.id)}
                              aria-label={`Marcar asistencia para ${crew.name}`}
                            />
                             {hasSent ? (
                              <CheckCircle2 className="h-5 w-5 text-primary transition-all" />
                            ) : (
                              <XCircle className="h-5 w-5 text-destructive transition-all" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No se encontraron cuadrillas con los filtros aplicados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddCrewDialogOpen} onOpenChange={setIsAddCrewDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agregar Nueva Cuadrilla</DialogTitle>
            <DialogDescription>
              Complete los detalles para registrar una nueva cuadrilla.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="crew-name" className="text-right">
                Nombre
              </Label>
              <Input
                id="crew-name"
                value={newCrewName}
                onChange={(e) => setNewCrewName(e.target.value)}
                className="col-span-3"
                placeholder="Ej. Equipo de Instalación"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="crew-responsible" className="text-right">
                Responsable
              </Label>
              <Input
                id="crew-responsible"
                value={newCrewResponsible}
                onChange={(e) => setNewCrewResponsible(e.target.value)}
                className="col-span-3"
                placeholder="Ej. Juan Pérez"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" onClick={handleAddCrew}>Guardar Cuadrilla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
