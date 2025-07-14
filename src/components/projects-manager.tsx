
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
import type { Project } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { deleteProject } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ProjectsManagerProps {
  initialProjects: Project[];
}

export default function ProjectsManager({ initialProjects }: ProjectsManagerProps) {
  const { toast } = useToast();
  const [allProjects, setAllProjects] = useState<Project[]>(initialProjects.sort((a, b) => a.name.localeCompare(b.name)));
  const [newProject, setNewProject] = useState({ name: "", identifier: "" });
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAddProject = () => {
    if (!newProject.name.trim() || !newProject.identifier.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre y el identificador del proyecto no pueden estar vacíos.",
        variant: "destructive",
      });
      return;
    }
    startTransition(async () => {
      try {
        const projectsRef = collection(db, 'projects');
        const q = query(projectsRef, where("identifier", "==", newProject.identifier.toUpperCase()));
        const existing = await getDocs(q);
        if (!existing.empty) {
            throw new Error('Ya existe un proyecto con el mismo identificador.');
        }

        const dataToSave = { name: newProject.name, identifier: newProject.identifier.toUpperCase() };
        const docRef = await addDoc(projectsRef, dataToSave);
        const addedProject = { id: docRef.id, ...dataToSave };

        setAllProjects((prev) => [...prev, addedProject].sort((a, b) => a.name.localeCompare(b.name)));
        setNewProject({ name: "", identifier: "" });
        toast({
          title: "Proyecto agregado",
          description: `El proyecto "${addedProject.name}" ha sido creado.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "No se pudo agregar el proyecto.",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleDeleteProject = () => {
    if (!projectToDelete) return;

    startTransition(async () => {
      try {
        await deleteProject(projectToDelete.id);
        setAllProjects((prev) => prev.filter((o) => o.id !== projectToDelete.id));
        toast({
          title: "Proyecto eliminado",
          description: `El proyecto "${projectToDelete.name}" ha sido eliminado con éxito.`,
        });
      } catch (error) {
        toast({
          title: "Error al eliminar",
          description: error instanceof Error ? error.message : "Ocurrió un error inesperado.",
          variant: "destructive",
        });
      } finally {
        setProjectToDelete(null);
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Proyectos</CardTitle>
          <CardDescription>
            Aquí puede ver todos los proyectos existentes, agregar nuevos o eliminarlos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">Agregar Nuevo Proyecto</h3>
              <div className="flex flex-col sm:flex-row items-end gap-2">
                <div className="w-full sm:w-auto flex-1">
                  <Label htmlFor="new-project-identifier" className="text-xs font-semibold">Identificador</Label>
                  <Input
                    id="new-project-identifier"
                    placeholder="Ej. PC01"
                    value={newProject.identifier}
                    onChange={(e) => setNewProject(prev => ({ ...prev, identifier: e.target.value }))}
                    disabled={isPending}
                  />
                </div>
                <div className="w-full sm:w-auto flex-[2]">
                  <Label htmlFor="new-project-name" className="text-xs font-semibold">Nombre del Proyecto</Label>
                  <Input
                    id="new-project-name"
                    placeholder="Nombre del nuevo proyecto"
                    value={newProject.name}
                    onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                    disabled={isPending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                          handleAddProject();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleAddProject} disabled={isPending || !newProject.name.trim() || !newProject.identifier.trim()}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Agregar
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">Proyectos Existentes ({allProjects.length})</h3>
              <ScrollArea className="h-72 rounded-md border">
                <div className="p-4">
                  {allProjects.length > 0 ? (
                    <ul className="space-y-2">
                      {allProjects.map((project) => (
                        <li key={project.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="font-mono">{project.identifier.toUpperCase()}</Badge>
                              <p className="font-medium">{project.name}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setProjectToDelete(project)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar {project.name}</span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground p-2 text-center">
                      No hay proyectos creados.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente el proyecto "{projectToDelete?.name}". Esta acción fallará si el proyecto tiene cuadrillas o empleados asignados.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setProjectToDelete(null)} disabled={isPending}>
                    Cancelar
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteProject} 
                  disabled={isPending}
                  className={buttonVariants({ variant: "destructive" })}
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, eliminar proyecto"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
