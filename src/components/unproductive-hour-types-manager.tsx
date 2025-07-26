
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
import type { UnproductiveHourType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { useIsMobile } from "@/hooks/use-mobile";

interface UnproductiveHourTypesManagerProps {
  initialUnproductiveHourTypes: UnproductiveHourType[];
}

export default function UnproductiveHourTypesManager({ initialUnproductiveHourTypes }: UnproductiveHourTypesManagerProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [allTypes, setAllTypes] = useState<UnproductiveHourType[]>(initialUnproductiveHourTypes.sort((a, b) => a.name.localeCompare(b.name)));
  const [newType, setNewType] = useState({ name: "", code: "" });
  const [typeToDelete, setTypeToDelete] = useState<UnproductiveHourType | null>(null);
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
        const collectionRef = collection(db, 'unproductive-hour-types');
        const q = query(collectionRef, where("code", "==", newType.code.toUpperCase()));
        const existing = await getDocs(q);
        if (!existing.empty) {
            throw new Error('Ya existe un tipo de hora improductiva con el mismo código.');
        }
        
        const dataToSave = { name: newType.name, code: newType.code.toUpperCase() };
        const docRef = await addDoc(collectionRef, dataToSave);
        const addedType = { id: docRef.id, ...dataToSave };

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
        await deleteDoc(doc(db, 'unproductive-hour-types', typeToDelete.id));
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

  const MobileTypeCard = ({ type }: { type: UnproductiveHourType }) => (
    <div className="p-4 flex justify-between items-center border rounded-lg">
      <div className="flex items-center gap-3">
          <Badge variant="secondary" className="font-mono">{type.code.toUpperCase()}</Badge>
          <p className="font-medium">{type.name}</p>
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setTypeToDelete(type)}
        disabled={isPending}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Horas Improductivas</CardTitle>
          <CardDescription>
            Gestione los tipos de horas improductivas que se pueden registrar en los partes diarios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">Agregar Nuevo Tipo de Hora Improductiva</h3>
              <div className="flex flex-col sm:flex-row items-end gap-2">
                <div className="grid gap-1.5 w-full sm:w-auto flex-1">
                  <Label htmlFor="new-type-code">Código</Label>
                  <Input
                    id="new-type-code"
                    placeholder="Ej. LLU"
                    value={newType.code}
                    onChange={(e) => setNewType(prev => ({ ...prev, code: e.target.value }))}
                    disabled={isPending}
                  />
                </div>
                <div className="grid gap-1.5 w-full sm:w-auto flex-[2]">
                  <Label htmlFor="new-type-name">Nombre del Tipo</Label>
                  <Input
                    id="new-type-name"
                    placeholder="Ej. Lluvia"
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
                <Button onClick={handleAddType} disabled={isPending || !newType.name.trim() || !newType.code.trim()} className="w-full sm:w-auto shrink-0">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Agregar
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">Tipos Existentes ({allTypes.length})</h3>
              <ScrollArea className="h-72 rounded-md border">
                {isMobile ? (
                  <div className="space-y-2 p-2">
                     {allTypes.map(type => <MobileTypeCard key={type.id} type={type} />)}
                  </div>
                ) : (
                  <div className="p-4">
                    {allTypes.length > 0 ? (
                      <ul className="space-y-2">
                        {allTypes.map((type) => (
                          <li key={type.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="font-mono">{type.code.toUpperCase()}</Badge>
                                <p className="font-medium">{type.name}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 shrink-0 self-end sm:self-center"
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
                        No hay tipos de horas improductivas creados.
                      </p>
                    )}
                  </div>
                )}
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
                    Esta acción no se puede deshacer. Se eliminará permanentemente el tipo de hora improductiva "{typeToDelete?.name}". Esta acción fallará si el tipo está en uso.
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
