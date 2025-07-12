
"use client";

import { useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Trash2 } from "lucide-react";
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
import type { Obra } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addObra, deleteObra } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ObrasManagerProps {
  initialObras: Obra[];
}

export default function ObrasManager({ initialObras }: ObrasManagerProps) {
  const { toast } = useToast();
  const [allObras, setAllObras] = useState<Obra[]>(initialObras.sort((a, b) => a.name.localeCompare(b.name)));
  const [newObra, setNewObra] = useState({ name: "", identifier: "" });
  const [obraToDelete, setObraToDelete] = useState<Obra | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAddObra = () => {
    if (!newObra.name.trim() || !newObra.identifier.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre y el identificador de la obra no pueden estar vacíos.",
        variant: "destructive",
      });
      return;
    }
    startTransition(async () => {
      try {
        const addedObra = await addObra({ name: newObra.name, identifier: newObra.identifier.toUpperCase() });
        setAllObras((prev) => [...prev, addedObra].sort((a, b) => a.name.localeCompare(b.name)));
        setNewObra({ name: "", identifier: "" });
        toast({
          title: "Obra agregada",
          description: `La obra "${addedObra.name}" ha sido creada.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "No se pudo agregar la obra.",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleDeleteObra = () => {
    if (!obraToDelete) return;

    startTransition(async () => {
      try {
        await deleteObra(obraToDelete.id);
        setAllObras((prev) => prev.filter((o) => o.id !== obraToDelete.id));
        toast({
          title: "Obra eliminada",
          description: `La obra "${obraToDelete.name}" ha sido eliminada con éxito.`,
        });
      } catch (error) {
        toast({
          title: "Error al eliminar",
          description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
          variant: "destructive",
        });
      } finally {
        setObraToDelete(null);
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Obras</CardTitle>
          <CardDescription>
            Aquí puede ver todas las obras existentes, agregar nuevas o eliminarlas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">Agregar Nueva Obra</h3>
              <div className="flex flex-col sm:flex-row items-end gap-2">
                <div className="w-full sm:w-auto flex-1">
                  <Label htmlFor="new-obra-identifier" className="text-xs font-semibold">Identificador</Label>
                  <Input
                    id="new-obra-identifier"
                    placeholder="Ej. PC01"
                    value={newObra.identifier}
                    onChange={(e) => setNewObra(prev => ({ ...prev, identifier: e.target.value }))}
                    disabled={isPending}
                  />
                </div>
                <div className="w-full sm:w-auto flex-[2]">
                  <Label htmlFor="new-obra-name" className="text-xs font-semibold">Nombre de la Obra</Label>
                  <Input
                    id="new-obra-name"
                    placeholder="Nombre de la nueva obra"
                    value={newObra.name}
                    onChange={(e) => setNewObra(prev => ({ ...prev, name: e.target.value }))}
                    disabled={isPending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                          handleAddObra();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleAddObra} disabled={isPending || !newObra.name.trim() || !newObra.identifier.trim()}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Agregar
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">Obras Existentes ({allObras.length})</h3>
              <ScrollArea className="h-72 rounded-md border">
                <div className="p-4">
                  {allObras.length > 0 ? (
                    <ul className="space-y-2">
                      {allObras.map((obra) => (
                        <li key={obra.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="font-mono">{obra.identifier.toUpperCase()}</Badge>
                              <p className="font-medium">{obra.name}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setObraToDelete(obra)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar {obra.name}</span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground p-2 text-center">
                      No hay obras creadas.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!obraToDelete} onOpenChange={(open) => !open && setObraToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente la obra "{obraToDelete?.name}". Esta acción fallará si la obra tiene cuadrillas o empleados asignados.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setObraToDelete(null)} disabled={isPending}>
                    Cancelar
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteObra} 
                  disabled={isPending}
                  className={buttonVariants({ variant: "destructive" })}
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, eliminar obra"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
