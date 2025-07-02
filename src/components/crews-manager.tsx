"use client";

import { useState, useTransition, useMemo } from "react";
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
import { Label } from "@/components/ui/label";
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
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import type { Crew, Obra } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addCrew, deleteCrew } from "@/app/actions";

interface CrewsManagerProps {
  initialCrews: Crew[];
  initialObras: Obra[];
}

export default function CrewsManager({ initialCrews, initialObras }: CrewsManagerProps) {
  const { toast } = useToast();
  const [allCrews, setAllCrews] = useState<Crew[]>(initialCrews);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [crewToDelete, setCrewToDelete] = useState<Crew | null>(null);
  
  const [newCrewName, setNewCrewName] = useState("");
  const [newCrewCapataz, setNewCrewCapataz] = useState("");
  const [newCrewApuntador, setNewCrewApuntador] = useState("");
  const [newCrewObraId, setNewCrewObraId] = useState("");
  
  const [isPending, startTransition] = useTransition();

  const obraNameMap = useMemo(() => {
    return Object.fromEntries(initialObras.map(obra => [obra.id, obra.name]));
  }, [initialObras]);

  const handleAddCrew = () => {
    if (!newCrewName.trim() || !newCrewCapataz.trim() || !newCrewApuntador.trim() || !newCrewObraId) {
      toast({
        title: "Error de validación",
        description: "Debe completar todos los campos para crear una cuadrilla.",
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
          obraId: newCrewObraId
        });
        setAllCrews((prev) => [...prev, newCrew]);
        setNewCrewName("");
        setNewCrewCapataz("");
        setNewCrewApuntador("");
        setNewCrewObraId("");
        setIsAddDialogOpen(false);
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
  
  const handleDeleteCrew = () => {
    if (!crewToDelete) return;

    startTransition(async () => {
      try {
        await deleteCrew(crewToDelete.id);
        setAllCrews((prev) => prev.filter((c) => c.id !== crewToDelete.id));
        toast({
          title: "Cuadrilla eliminada",
          description: `La cuadrilla "${crewToDelete.name}" ha sido eliminada con éxito.`,
        });
      } catch (error) {
        toast({
          title: "Error al eliminar",
          description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
          variant: "destructive",
        });
      } finally {
        setCrewToDelete(null);
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Lista de Cuadrillas</CardTitle>
                <CardDescription>
                    Aquí puede ver y gestionar todas las cuadrillas.
                </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Cuadrilla
            </Button>
        </CardHeader>
        <CardContent>
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Obra</TableHead>
                            <TableHead>Capataz</TableHead>
                            <TableHead>Apuntador</TableHead>
                            <TableHead className="text-right w-[100px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {allCrews.length > 0 ? (
                            allCrews.map((crew) => (
                                <TableRow key={crew.id}>
                                    <TableCell className="font-medium">{crew.name}</TableCell>
                                    <TableCell>{obraNameMap[crew.obraId] || 'N/A'}</TableCell>
                                    <TableCell>{crew.capataz}</TableCell>
                                    <TableCell>{crew.apuntador}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={() => setCrewToDelete(crew)}
                                            disabled={isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Eliminar {crew.name}</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No hay cuadrillas creadas.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agregar Nueva Cuadrilla</DialogTitle>
            <DialogDescription>
              Complete los detalles para registrar una nueva cuadrilla.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="crew-name" className="text-right">Nombre</Label>
              <Input id="crew-name" value={newCrewName} onChange={(e) => setNewCrewName(e.target.value)} className="col-span-3" placeholder="Ej. Equipo de Montaje" disabled={isPending}/>
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
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!crewToDelete} onOpenChange={(open) => !open && setCrewToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente la cuadrilla "{crewToDelete?.name}".
                    No podrá eliminar una cuadrilla si tiene registros de asistencia asociados.
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
    </>
  );
}
