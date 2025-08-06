
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
import type { Phase, Project } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";

interface PhasesManagerProps {
  initialPhases: Phase[];
  initialProjects: Project[];
}

export default function PhasesManager({ initialPhases, initialProjects }: PhasesManagerProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [allPhases, setAllPhases] = useState<Phase[]>(initialPhases);
  const [newPhase, setNewPhase] = useState({ name: "", pepElement: "" });
  const [phaseToDelete, setPhaseToDelete] = useState<Phase | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(initialProjects[0]?.id);
  const [isPending, startTransition] = useTransition();

  const sortedProjects = useMemo(() => [...initialProjects].sort((a,b) => a.name.localeCompare(b.name)), [initialProjects]);
  
  const filteredPhases = useMemo(() => {
    if (!selectedProjectId) return [];
    return allPhases
        .filter(p => p.projectId === selectedProjectId)
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [allPhases, selectedProjectId]);


  const handleAddPhase = () => {
    if (!selectedProjectId || !newPhase.name.trim() || !newPhase.pepElement.trim()) {
      toast({
        title: "Error de validación",
        description: "Debe seleccionar un proyecto y completar el nombre y el elemento PEP de la fase.",
        variant: "destructive",
      });
      return;
    }
    startTransition(async () => {
      try {
        const collectionRef = collection(db, 'phases');
        const q = query(collectionRef, where("name", "==", newPhase.name), where("projectId", "==", selectedProjectId));
        const existing = await getDocs(q);
        if (!existing.empty) {
            throw new Error('Ya existe una fase con el mismo nombre en este proyecto.');
        }

        const dataToSave = { 
            name: newPhase.name, 
            pepElement: newPhase.pepElement.toUpperCase(),
            projectId: selectedProjectId
        };
        const docRef = await addDoc(collectionRef, dataToSave);
        const addedPhase = { id: docRef.id, ...dataToSave };

        setAllPhases((prev) => [...prev, addedPhase]);
        setNewPhase({ name: "", pepElement: "" });
        toast({
          title: "Fase agregada",
          description: `La fase "${addedPhase.name}" ha sido creada.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "No se pudo agregar la fase.",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleDeletePhase = () => {
    if (!phaseToDelete) return;

    startTransition(async () => {
      try {
        await deleteDoc(doc(db, 'phases', phaseToDelete.id));
        setAllPhases((prev) => prev.filter((p) => p.id !== phaseToDelete.id));
        toast({
          title: "Fase eliminada",
          description: `La fase "${phaseToDelete.name}" ha sido eliminada con éxito.`,
        });
      } catch (error) {
        toast({
          title: "Error al eliminar",
          description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
          variant: "destructive",
        });
      } finally {
        setPhaseToDelete(null);
      }
    });
  };

  const MobilePhaseCard = ({ phase }: { phase: Phase }) => (
    <div className="p-4 flex justify-between items-center border rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{phase.name}</p>
        <Badge variant="secondary" className="font-mono mt-1">{phase.pepElement.toUpperCase()}</Badge>
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setPhaseToDelete(phase)}
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
          <CardTitle>Fases del Proyecto</CardTitle>
          <CardDescription>
            Seleccione un proyecto para gestionar sus fases y elementos PEP asociados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
                <Label htmlFor="project-filter">Proyecto</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger id="project-filter">
                        <SelectValue placeholder="Seleccione un proyecto..." />
                    </SelectTrigger>
                    <SelectContent>
                        {sortedProjects.map(project => (
                            <SelectItem key={project.id} value={project.id}>
                                {project.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">Agregar Nueva Fase</h3>
              <div className="flex flex-col sm:flex-row items-end gap-2">
                <div className="grid gap-1.5 w-full sm:w-auto flex-[2]">
                  <Label htmlFor="new-phase-name">Nombre de la Fase</Label>
                  <Input
                    id="new-phase-name"
                    placeholder="Ej. Movimiento de Suelos"
                    value={newPhase.name}
                    onChange={(e) => setNewPhase(prev => ({ ...prev, name: e.target.value }))}
                    disabled={isPending || !selectedProjectId}
                  />
                </div>
                <div className="grid gap-1.5 w-full sm:w-auto flex-1">
                  <Label htmlFor="new-phase-pep">Elemento PEP</Label>
                  <Input
                    id="new-phase-pep"
                    placeholder="Ej. A-110-C1001"
                    value={newPhase.pepElement}
                    onChange={(e) => setNewPhase(prev => ({ ...prev, pepElement: e.target.value }))}
                    disabled={isPending || !selectedProjectId}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                          handleAddPhase();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleAddPhase} disabled={isPending || !newPhase.name.trim() || !newPhase.pepElement.trim() || !selectedProjectId} className="w-full sm:w-auto shrink-0">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Agregar
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">Fases Existentes ({filteredPhases.length})</h3>
              <ScrollArea className="h-72 rounded-md border">
                {isMobile ? (
                  <div className="space-y-2 p-2">
                     {filteredPhases.map(phase => <MobilePhaseCard key={phase.id} phase={phase} />)}
                  </div>
                ) : (
                  <div className="p-4">
                    {filteredPhases.length > 0 ? (
                      <ul className="space-y-2">
                        {filteredPhases.map((phase) => (
                          <li key={phase.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="font-mono">{phase.pepElement.toUpperCase()}</Badge>
                                <p className="font-medium">{phase.name}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 shrink-0 self-end sm:self-center"
                              onClick={() => setPhaseToDelete(phase)}
                              disabled={isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Eliminar {phase.name}</span>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground p-2 text-center">
                        {selectedProjectId ? "No hay fases creadas para este proyecto." : "Por favor, seleccione un proyecto."}
                      </p>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!phaseToDelete} onOpenChange={(open) => !open && setPhaseToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente la fase "{phaseToDelete?.name}". Esta acción fallará si la fase está asignada a alguna cuadrilla.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPhaseToDelete(null)} disabled={isPending}>
                    Cancelar
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeletePhase} 
                  disabled={isPending}
                  className={buttonVariants({ variant: "destructive" })}
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, eliminar fase"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
