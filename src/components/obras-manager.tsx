"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import type { Obra } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addObra } from "@/app/actions";

interface ObrasManagerProps {
  initialObras: Obra[];
}

export default function ObrasManager({ initialObras }: ObrasManagerProps) {
  const { toast } = useToast();
  const [allObras, setAllObras] = useState<Obra[]>(initialObras);
  const [newObraName, setNewObraName] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleAddObra = () => {
    if (!newObraName.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre de la obra no puede estar vacío.",
        variant: "destructive",
      });
      return;
    }
    startTransition(async () => {
      try {
        const newObra = await addObra({ name: newObraName });
        setAllObras((prev) => [...prev, newObra].sort((a, b) => a.name.localeCompare(b.name)));
        setNewObraName("");
        toast({
          title: "Obra agregada",
          description: `La obra "${newObra.name}" ha sido creada.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo agregar la obra.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Obras</CardTitle>
        <CardDescription>
          Aquí puede ver todas las obras existentes y agregar nuevas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold">Agregar Nueva Obra</h3>
            <div className="flex items-center gap-2">
              <Input
                id="new-obra-name"
                placeholder="Nombre de la nueva obra"
                value={newObraName}
                onChange={(e) => setNewObraName(e.target.value)}
                disabled={isPending}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleAddObra();
                    }
                }}
              />
              <Button onClick={handleAddObra} disabled={isPending || !newObraName.trim()}>
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
                      <li key={obra.id} className="p-2 rounded-md bg-muted/50">
                        <p className="font-medium">{obra.name}</p>
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
  );
}
