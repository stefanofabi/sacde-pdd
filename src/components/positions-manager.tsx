
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
import type { EmployeePosition } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { useIsMobile } from "@/hooks/use-mobile";

interface PositionsManagerProps {
  initialPositions: EmployeePosition[];
}

export default function PositionsManager({ initialPositions }: PositionsManagerProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [allPositions, setAllPositions] = useState<EmployeePosition[]>(initialPositions.sort((a, b) => a.name.localeCompare(b.name)));
  const [newPosition, setNewPosition] = useState({ name: "", code: "" });
  const [positionToDelete, setPositionToDelete] = useState<EmployeePosition | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAddPosition = () => {
    if (!newPosition.name.trim() || !newPosition.code.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre y el código de la posición no pueden estar vacíos.",
        variant: "destructive",
      });
      return;
    }
    startTransition(async () => {
      try {
        const collectionRef = collection(db, 'employee-positions');
        const q = query(collectionRef, where("code", "==", newPosition.code.toUpperCase()));
        const existing = await getDocs(q);
        if (!existing.empty) {
            throw new Error('Ya existe una posición con el mismo código.');
        }

        const dataToSave = { name: newPosition.name, code: newPosition.code.toUpperCase() };
        const docRef = await addDoc(collectionRef, dataToSave);
        const addedPosition = { id: docRef.id, ...dataToSave };

        setAllPositions((prev) => [...prev, addedPosition].sort((a, b) => a.name.localeCompare(b.name)));
        setNewPosition({ name: "", code: "" });
        toast({
          title: "Posición agregada",
          description: `La posición "${addedPosition.name}" ha sido creada.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "No se pudo agregar la posición.",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleDeletePosition = () => {
    if (!positionToDelete) return;

    startTransition(async () => {
      try {
        await deleteDoc(doc(db, 'employee-positions', positionToDelete.id));
        setAllPositions((prev) => prev.filter((p) => p.id !== positionToDelete.id));
        toast({
          title: "Posición eliminada",
          description: `La posición "${positionToDelete.name}" ha sido eliminada con éxito.`,
        });
      } catch (error) {
        toast({
          title: "Error al eliminar",
          description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
          variant: "destructive",
        });
      } finally {
        setPositionToDelete(null);
      }
    });
  };

  const MobilePositionCard = ({ position }: { position: EmployeePosition }) => (
    <div className="p-4 flex justify-between items-center border rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{position.name}</p>
        <Badge variant="secondary" className="font-mono mt-1">{position.code.toUpperCase()}</Badge>
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setPositionToDelete(position)}
        disabled={isPending}
        className="ml-4"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Posiciones de Empleados</CardTitle>
          <CardDescription>
            Gestione las posiciones laborales y sus códigos asociados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">Agregar Nueva Posición</h3>
              <div className="flex flex-col sm:flex-row items-end gap-2">
                <div className="grid gap-1.5 w-full sm:w-auto flex-[2]">
                  <Label htmlFor="new-position-name">Nombre de la Posición</Label>
                  <Input
                    id="new-position-name"
                    placeholder="Ej. Oficial de Primera"
                    value={newPosition.name}
                    onChange={(e) => setNewPosition(prev => ({ ...prev, name: e.target.value }))}
                    disabled={isPending}
                  />
                </div>
                <div className="grid gap-1.5 w-full sm:w-auto flex-1">
                  <Label htmlFor="new-position-code">Código</Label>
                  <Input
                    id="new-position-code"
                    placeholder="Ej. OF1"
                    value={newPosition.code}
                    onChange={(e) => setNewPosition(prev => ({ ...prev, code: e.target.value }))}
                    disabled={isPending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                          handleAddPosition();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleAddPosition} disabled={isPending || !newPosition.name.trim() || !newPosition.code.trim()} className="w-full sm:w-auto shrink-0">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Agregar
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">Posiciones Existentes ({allPositions.length})</h3>
              <ScrollArea className="h-72 rounded-md border">
                {isMobile ? (
                  <div className="space-y-2 p-2">
                     {allPositions.map(pos => <MobilePositionCard key={pos.id} position={pos} />)}
                  </div>
                ) : (
                  <div className="p-4">
                    {allPositions.length > 0 ? (
                      <ul className="space-y-2">
                        {allPositions.map((position) => (
                          <li key={position.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="font-mono">{position.code.toUpperCase()}</Badge>
                                <p className="font-medium">{position.name}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 shrink-0 self-end sm:self-center"
                              onClick={() => setPositionToDelete(position)}
                              disabled={isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Eliminar {position.name}</span>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground p-2 text-center">
                        No hay posiciones creadas.
                      </p>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!positionToDelete} onOpenChange={(open) => !open && setPositionToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente la posición "{positionToDelete?.name}". Esta acción fallará si la posición está asignada a algún empleado.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPositionToDelete(null)} disabled={isPending}>
                    Cancelar
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeletePosition} 
                  disabled={isPending}
                  className={buttonVariants({ variant: "destructive" })}
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, eliminar posición"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
