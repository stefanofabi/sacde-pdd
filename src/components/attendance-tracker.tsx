
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar as CalendarIcon,
  PlusCircle,
  Search,
  Loader2,
  Copy,
  Users,
  X,
  Plus,
} from "lucide-react";
import { format, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import type { Crew, AttendanceData, AttendanceStatus, Obra } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addCrew, updateAttendanceStatus, setDailyCrews, clonePreviousDayAttendance } from "@/app/actions";

interface AttendanceTrackerProps {
  initialCrews: Crew[];
  initialAttendance: AttendanceData;
  initialObras: Obra[];
}

export default function AttendanceTracker({ initialCrews, initialAttendance, initialObras }: AttendanceTrackerProps) {
  const { toast } = useToast();
  const [allCrews, setAllCrews] = useState<Crew[]>(initialCrews);
  const [attendance, setAttendance] = useState<AttendanceData>(initialAttendance);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddCrewDialogOpen, setIsAddCrewDialogOpen] = useState(false);
  const [isManageCrewsDialogOpen, setIsManageCrewsDialogOpen] = useState(false);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [newCrewName, setNewCrewName] = useState("");
  const [newCrewCapataz, setNewCrewCapataz] = useState("");
  const [newCrewApuntador, setNewCrewApuntador] = useState("");
  const [newCrewObraId, setNewCrewObraId] = useState("");
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

  const dailyCrewIds = useMemo(() => {
    return formattedDate ? Object.keys(attendance[formattedDate] || {}) : [];
  }, [attendance, formattedDate]);

  const crewsForDay = useMemo(() => {
    return allCrews.filter(crew => dailyCrewIds.includes(crew.id));
  }, [allCrews, dailyCrewIds]);

  const availableCrews = useMemo(() => {
      return allCrews.filter(crew => !dailyCrewIds.includes(crew.id));
  }, [allCrews, dailyCrewIds]);
  
  const [tempDailyCrewIds, setTempDailyCrewIds] = useState<string[]>([]);

  useEffect(() => {
    setTempDailyCrewIds(dailyCrewIds);
  }, [dailyCrewIds, isManageCrewsDialogOpen]);

  const filteredCrewsForTable = useMemo(() => {
    return crewsForDay.filter((crew) =>
        crew.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crew.capataz.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crew.apuntador.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (obraNameMap[crew.obraId] || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [crewsForDay, searchTerm, obraNameMap]);
  
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

  const handleAddCrew = () => {
    if (!newCrewName.trim() || !newCrewCapataz.trim() || !newCrewApuntador.trim() || !newCrewObraId) {
      toast({
        title: "Error de validación",
        description: "Debe completar todos los campos, incluyendo la obra.",
        variant: "destructive",
      });
      return;
    }
    
    startTransition(async () => {
        try {
            const newCrew = await addCrew({
                name: newCrewName,
                capataz: newCrewCapataz,
                apuntador: newCrewApuntador,
                obraId: newCrewObraId,
            });
            setAllCrews((prevCrews) => [...prevCrews, newCrew]);
            setNewCrewName("");
            setNewCrewCapataz("");
            setNewCrewApuntador("");
            setNewCrewObraId("");
            setIsAddCrewDialogOpen(false);
            toast({
              title: "Cuadrilla agregada",
              description: `La cuadrilla "${newCrew.name}" ha sido creada. Ahora puede gestionarla desde la sección 'Cuadrillas'.`,
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

  const handleSaveDailyCrews = () => {
    if (!selectedDate) return;
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    startTransition(async () => {
        try {
            const newAttendance = await setDailyCrews(dateKey, tempDailyCrewIds);
            setAttendance(newAttendance);
            setIsManageCrewsDialogOpen(false);
            toast({
              title: "Lista actualizada",
              description: "Se guardaron las cuadrillas para el parte del día.",
            });
        } catch (error) {
            toast({
              title: "Error",
              description: "No se pudo guardar la lista de cuadrillas.",
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
                description: `Se clonó la lista de cuadrillas del día anterior. Todos los estados se reiniciaron a 'no enviado'.`,
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
                placeholder="Buscar por cuadrilla, obra..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
                <Button onClick={() => setIsManageCrewsDialogOpen(true)} variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Gestionar Cuadrillas del Día
                </Button>
                <Button onClick={() => setIsCloneDialogOpen(true)} variant="outline">
                    <Copy className="mr-2 h-4 w-4" />
                    Clonar Día Anterior
                </Button>
                <Button onClick={() => setIsAddCrewDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Crear Cuadrilla Nueva
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
                  <TableHead>Capataz</TableHead>
                  <TableHead>Apuntador</TableHead>
                  <TableHead className="text-center w-[150px]">Enviado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCrewsForTable.length > 0 ? (
                  filteredCrewsForTable.map((crew) => (
                      <TableRow key={crew.id}>
                        <TableCell className="font-medium">{crew.name}</TableCell>
                        <TableCell>{obraNameMap[crew.obraId] || 'N/A'}</TableCell>
                        <TableCell>{crew.capataz}</TableCell>
                        <TableCell>{crew.apuntador}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={attendance[formattedDate]?.[crew.id] || false}
                            onCheckedChange={(checked) => handleUpdateAttendance(crew.id, checked)}
                            disabled={isPending}
                            aria-label={`Marcar asistencia para ${crew.name}`}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      {dailyCrewIds.length === 0 
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

      <Dialog open={isAddCrewDialogOpen} onOpenChange={setIsAddCrewDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crear Nueva Cuadrilla</DialogTitle>
            <DialogDescription>
              Complete los detalles para registrar una nueva cuadrilla.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="crew-name" className="text-right">Nombre</Label>
              <Input id="crew-name" value={newCrewName} onChange={(e) => setNewCrewName(e.target.value)} className="col-span-3" placeholder="Ej. Equipo de Instalación" disabled={isPending}/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="crew-capataz" className="text-right">Capataz</Label>
              <Input id="crew-capataz" value={newCrewCapataz} onChange={(e) => setNewCrewCapataz(e.target.value)} className="col-span-3" placeholder="Ej. Juan Pérez" disabled={isPending}/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="crew-apuntador" className="text-right">Apuntador</Label>
              <Input id="crew-apuntador" value={newCrewApuntador} onChange={(e) => setNewCrewApuntador(e.target.value)} className="col-span-3" placeholder="Ej. Pedro Gómez" disabled={isPending}/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="crew-obra" className="text-right">Obra</Label>
               <Select onValueChange={setNewCrewObraId} value={newCrewObraId} disabled={isPending}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione una obra" />
                </SelectTrigger>
                <SelectContent>
                  {initialObras.map((obra) => (
                    <SelectItem key={obra.id} value={obra.id}>{obra.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>Cancelar</Button></DialogClose>
            <Button type="submit" onClick={handleAddCrew} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cuadrilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <Dialog open={isManageCrewsDialogOpen} onOpenChange={setIsManageCrewsDialogOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Gestionar Cuadrillas para el {displayDate}</DialogTitle>
                <DialogDescription>
                    Añada o quite cuadrillas de la lista de asistencia para este día.
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
                <div className="flex flex-col gap-2">
                    <h3 className="font-semibold">Cuadrillas Disponibles</h3>
                    <ScrollArea className="flex-1 rounded-md border p-2">
                        {availableCrews
                            .filter(c => !tempDailyCrewIds.includes(c.id))
                            .map(crew => (
                            <div key={crew.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                <div>
                                    <p className="font-medium">{crew.name}</p>
                                    <p className="text-sm text-muted-foreground">{obraNameMap[crew.obraId]}</p>
                                </div>
                                <Button size="icon" variant="outline" onClick={() => setTempDailyCrewIds(ids => [...ids, crew.id])} disabled={isPending}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </ScrollArea>
                </div>
                <div className="flex flex-col gap-2">
                    <h3 className="font-semibold">Cuadrillas en el Parte ({tempDailyCrewIds.length})</h3>
                    <ScrollArea className="flex-1 rounded-md border p-2">
                        {allCrews
                            .filter(c => tempDailyCrewIds.includes(c.id))
                            .map(crew => (
                               <div key={crew.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                <div>
                                    <p className="font-medium">{crew.name}</p>
                                    <p className="text-sm text-muted-foreground">{obraNameMap[crew.obraId]}</p>
                                </div>
                                <Button size="icon" variant="destructive" onClick={() => setTempDailyCrewIds(ids => ids.filter(id => id !== crew.id))} disabled={isPending}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </ScrollArea>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>Cancelar</Button></DialogClose>
                <Button onClick={handleSaveDailyCrews} disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Cambios
                </Button>
            </DialogFooter>
        </DialogContent>
       </Dialog>
      
      <AlertDialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Clonar lista del día anterior?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción reemplazará la lista de cuadrillas de hoy ({displayDate}) con la lista del día anterior. Todos los estados de asistencia se reiniciarán a "no enviado". ¿Desea continuar?
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
