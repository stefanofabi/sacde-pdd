
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
import { Label } from "@/components/ui/label";
import {
  Calendar as CalendarIcon,
  PlusCircle,
  Search,
  Loader2,
  Trash2,
} from "lucide-react";
import { format, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import type { Crew, AttendanceData, AttendanceStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addCrew, updateAttendanceStatus, removeAttendance, deleteCrew } from "@/app/actions";

interface AttendanceTrackerProps {
  initialCrews: Crew[];
  initialAttendance: AttendanceData;
}

const attendanceStatusOptions: { value: AttendanceStatus; label: string }[] = [
    { value: "presente", label: "Presente" },
    { value: "ausente", label: "Ausente" },
    { value: "franco", label: "Franco" },
    { value: "permiso", label: "Permiso" },
];

export default function AttendanceTracker({ initialCrews, initialAttendance }: AttendanceTrackerProps) {
  const { toast } = useToast();
  const [crews, setCrews] = useState<Crew[]>(initialCrews);
  const [attendance, setAttendance] = useState<AttendanceData>(initialAttendance);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AttendanceStatus | "undefined">("all");
  const [isAddCrewDialogOpen, setIsAddCrewDialogOpen] = useState(false);
  const [crewToDelete, setCrewToDelete] = useState<Crew | null>(null);
  const [newCrewName, setNewCrewName] = useState("");
  const [newCrewResponsible, setNewCrewResponsible] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedDate(startOfToday());
  }, []);

  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const displayDate = selectedDate
    ? format(selectedDate, "PPP", { locale: es })
    : "Seleccione una fecha";

  const filteredCrews = useMemo(() => {
    if (!selectedDate) return [];
    const dailyAttendance = attendance[formattedDate] || {};

    return crews.filter((crew) => {
      const status = dailyAttendance[crew.id];
      const matchesSearch =
        crew.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crew.responsible.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      switch (statusFilter) {
        case "all":
          return true;
        case "undefined":
          return !status;
        default:
          return status === statusFilter;
      }
    });
  }, [crews, attendance, selectedDate, searchTerm, statusFilter, formattedDate]);
  
  const handleUpdateAttendance = (crewId: string, status: AttendanceStatus) => {
    if (!selectedDate) return;
    const dateKey = format(selectedDate, "yyyy-MM-dd");

    startTransition(async () => {
      try {
        await updateAttendanceStatus(dateKey, crewId, status);
        setAttendance((prev) => ({
          ...prev,
          [dateKey]: {
            ...prev[dateKey],
            [crewId]: status,
          },
        }));
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar la asistencia.",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleRemoveAttendance = (crewId: string) => {
    if (!selectedDate) return;
    const dateKey = format(selectedDate, "yyyy-MM-dd");

    startTransition(async () => {
        try {
            await removeAttendance(dateKey, crewId);
            setAttendance((prev) => {
                const newDailyAttendance = { ...(prev[dateKey] || {}) };
                delete newDailyAttendance[crewId];
                return {
                    ...prev,
                    [dateKey]: newDailyAttendance,
                };
            });
            toast({
              title: "Asistencia reiniciada",
              description: "El estado de la cuadrilla se ha marcado como no definido para esta fecha.",
            });
        } catch (error) {
            toast({
              title: "Error",
              description: "No se pudo reiniciar la asistencia.",
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
        setCrews((prev) => prev.filter((c) => c.id !== crewToDelete.id));
        setCrewToDelete(null);
        toast({
          title: "Cuadrilla eliminada",
          description: `La cuadrilla "${crewToDelete.name}" ha sido eliminada.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo eliminar la cuadrilla.",
          variant: "destructive",
        });
      }
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
    
    startTransition(async () => {
        try {
            const newCrew = await addCrew({
                name: newCrewName,
                responsible: newCrewResponsible,
            });
            setCrews((prevCrews) => [...prevCrews, newCrew]);
            setNewCrewName("");
            setNewCrewResponsible("");
            setIsAddCrewDialogOpen(false);
            toast({
              title: "Cuadrilla agregada",
              description: `La cuadrilla "${newCrew.name}" ha sido creada.`,
            });
        } catch (error) {
            toast({
              title: "Error",
              description: "No se pudo agregar la cuadrilla.",
              variant: "destructive",
            });
        }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Registro de Asistencia</CardTitle>
          <CardDescription>
            Seleccione una fecha y filtre para ver y modificar el estado de las
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
                  onSelect={setSelectedDate}
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
              onValueChange={(value: any) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="presente">Presente</SelectItem>
                <SelectItem value="ausente">Ausente</SelectItem>
                <SelectItem value="franco">Franco</SelectItem>
                <SelectItem value="permiso">Permiso</SelectItem>
                <SelectItem value="undefined">No Definido</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setIsAddCrewDialogOpen(true)} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Agregar Cuadrilla
            </Button>
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
                  <TableHead>Responsable</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCrews.length > 0 ? (
                  filteredCrews.map((crew) => (
                      <TableRow key={crew.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{crew.name}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setCrewToDelete(crew)} disabled={isPending}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar cuadrilla</span>
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{crew.responsible}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                          <Select
                              value={attendance[formattedDate]?.[crew.id] || 'undefined'}
                              onValueChange={(value: AttendanceStatus | 'undefined') => {
                                if (value === 'undefined') {
                                    handleRemoveAttendance(crew.id);
                                } else {
                                    handleUpdateAttendance(crew.id, value);
                                }
                              }}
                              disabled={isPending}
                          >
                              <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Definir estado..." />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="undefined">
                                      <span className="text-muted-foreground">No Definido</span>
                                  </SelectItem>
                                  <SelectItem value="presente">Presente</SelectItem>
                                  <SelectItem value="ausente">Ausente</SelectItem>
                                  <SelectItem value="franco">Franco</SelectItem>
                                  <SelectItem value="permiso">Permiso</SelectItem>
                              </SelectContent>
                          </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
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
                disabled={isPending}
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
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" onClick={handleAddCrew} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cuadrilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!crewToDelete} onOpenChange={(open) => !open && setCrewToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente la cuadrilla "{crewToDelete?.name}" y todos sus registros de asistencia asociados.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setCrewToDelete(null)} disabled={isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCrew} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Eliminar"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
