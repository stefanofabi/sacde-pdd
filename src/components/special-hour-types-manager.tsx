
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
import type { SpecialHourType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addSpecialHourType, deleteSpecialHourType } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface SpecialHourTypesManagerProps {
  initialSpecialHourTypes: SpecialHourType[];
}

export default function SpecialHourTypesManager({ initialSpecialHourTypes }: SpecialHourTypesManagerProps) {
  const { toast } = useToast();
  const [allTypes, setAllTypes] = useState<SpecialHourType[]>(initialSpecialHourTypes.sort((a, b) => a.name.localeCompare(b.name)));
  const [newType, setNewType] = useState({ name: "", code: "" });
  const [typeToDelete, setTypeToDelete] = useState<SpecialHourType | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAddType = () => {
    if (!newType.name.trim() || !newType.code.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre y el código del tipo no pueden estar vacíos.",
        variant: "destructive",
      });
      return;
    }
    startTransition(async () => {
      try {
        const addedType = await addSpecialHourType({ name: newType.name, code: newType.code.toUpperCase() });
        setAllTypes((prev) => [...prev, addedType].sort((a, b) => a.name.localeCompare(b.name)));
        setNewType({ name: "", code: "" });
        toast({
          title: "Tipo agregado",
          description: `El tipo "${addedType.name}" ha sido creado.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "No se pudo agregar el tipo.",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleDeleteType = () => {
    if (!typeToDelete) return;

    startTransition(async () => {
      try {
        await deleteSpecialHourType(typeToDelete.id);
        setAllTypes((prev) => prev.filter((o) => o.id !== typeToDelete.id));
        toast({
          title: "Tipo eliminado",
          description: `El tipo "${typeToDelete.name}" ha sido eliminado con éxito.`,
        });
      } catch (error) {
        toast({
          title: "Error al eliminar",
          description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
          variant: "destructive",
        });
      } finally {
        setTypeToDelete(null);
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Horas Especiales</CardTitle>
          <CardDescription>
            Gestione los tipos de horas especiales que se pueden registrar en los partes diarios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">Agregar Nuevo Tipo de Hora Especial</h3>
              <div className="flex flex-col sm:flex-row items-end gap-2">
                <div className="w-full sm:w-auto flex-1">
                  <Label htmlFor="new-type-code" className="text-xs font-semibold">Código</Label>
                  <Input
                    id="new-type-code"
                    placeholder="Ej. HS-AND"
                    value={newType.code}
                    onChange={(e) => setNewType(prev => ({ ...prev, code: e.target.value }))}
                    disabled={isPending}
                  />
                </div>
                <div className="w-full sm:w-auto flex-[2]">
                  <Label htmlFor="new-type-name" className="text-xs font-semibold">Nombre del Tipo</Label>
                  <Input
                    id="new-type-name"
                    placeholder="Ej. Horas Andamio"
                    value={newType.name}
                    onChange={(e) => setNewType(prev => ({ ...prev, name: e.target.value }))}
                    disabled={isPending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                          handleAddType();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleAddType} disabled={isPending || !newType.name.trim() || !newType.code.trim()}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Agregar
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">Tipos Existentes ({allTypes.length})</h3>
              <ScrollArea className="h-72 rounded-md border">
                <div className="p-4">
                  {allTypes.length > 0 ? (
                    <ul className="space-y-2">
                      {allTypes.map((type) => (
                        <li key={type.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="font-mono">{type.code.toUpperCase()}</Badge>
                              <p className="font-medium">{type.name}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setTypeToDelete(type)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar {type.name}</span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground p-2 text-center">
                      No hay tipos de horas especiales creados.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!typeToDelete} onOpenChange={(open) => !open && setTypeToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente el tipo de hora especial "{typeToDelete?.name}". Esta acción fallará si el tipo está en uso.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setTypeToDelete(null)} disabled={isPending}>
                    Cancelar
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteType} 
                  disabled={isPending}
                  className={buttonVariants({ variant: "destructive" })}
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, eliminar tipo"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
