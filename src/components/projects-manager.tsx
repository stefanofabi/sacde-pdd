
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
import { Loader2, Trash2, Check, X } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { collection, addDoc, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Switch } from "./ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "./ui/dialog";
import { Separator } from "./ui/separator";

interface ProjectsManagerProps {
  initialProjects: Project[];
}

export default function ProjectsManager({ initialProjects }: ProjectsManagerProps) {
  const { toast } = useToast();
  const [allProjects, setAllProjects] = useState<Project[]>(initialProjects.sort((a, b) => a.name.localeCompare(b.name)));
  const [newProject, setNewProject] = useState({ name: "", identifier: "", requiresControlGestionApproval: false, requiresJefeDeObraApproval: false });
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpenEditDialog = (project: Project) => {
    setProjectToEdit({
      ...project,
      requiresControlGestionApproval: project.requiresControlGestionApproval ?? false,
      requiresJefeDeObraApproval: project.requiresJefeDeObraApproval ?? false,
    });
  };

  const handleOpenAddDialog = () => {
    setProjectToEdit(null);
    setNewProject({ name: "", identifier: "", requiresControlGestionApproval: false, requiresJefeDeObraApproval: false });
  };

  const handleSaveProject = () => {
    const projectData = projectToEdit ? {
        name: projectToEdit.name,
        identifier: projectToEdit.identifier,
        requiresControlGestionApproval: projectToEdit.requiresControlGestionApproval,
        requiresJefeDeObraApproval: projectToEdit.requiresJefeDeObraApproval,
    } : newProject;

    if (!projectData.name.trim() || !projectData.identifier.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre y el identificador del proyecto no pueden estar vacíos.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      try {
        if (projectToEdit) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...dataToUpdate } = projectToEdit;
            const docRef = doc(db, 'projects', projectToEdit.id);
            await updateDoc(docRef, dataToUpdate);
            const updatedProject = { ...projectToEdit } as Project;
            setAllProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p).sort((a, b) => a.name.localeCompare(b.name)));
            toast({ title: "Proyecto actualizado", description: `El proyecto "${updatedProject.name}" ha sido actualizado.` });
            setProjectToEdit(null);

        } else {
            const projectsRef = collection(db, 'projects');
            const q = query(projectsRef, where("identifier", "==", newProject.identifier.toUpperCase()));
            const existing = await getDocs(q);
            if (!existing.empty) {
                throw new Error('Ya existe un proyecto con el mismo identificador.');
            }

            const dataToSave = { 
                name: newProject.name, 
                identifier: newProject.identifier.toUpperCase(),
                requiresControlGestionApproval: newProject.requiresControlGestionApproval,
                requiresJefeDeObraApproval: newProject.requiresJefeDeObraApproval,
            };
            const docRef = await addDoc(projectsRef, dataToSave);
            const addedProject = { id: docRef.id, ...dataToSave };

            setAllProjects((prev) => [...prev, addedProject].sort((a, b) => a.name.localeCompare(b.name)));
            setNewProject({ name: "", identifier: "", requiresControlGestionApproval: false, requiresJefeDeObraApproval: false });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "No se pudo guardar el proyecto.",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleDeleteProject = () => {
    if (!projectToDelete) return;

    startTransition(async () => {
      try {
        await deleteDoc(doc(db, 'projects', projectToDelete.id));
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
  
  const renderEditDialog = () => {
    const isEditing = !!projectToEdit;
    const projectData = isEditing ? projectToEdit : newProject;
    const setProjectData = isEditing
      ? (value: React.SetStateAction<Project>) => setProjectToEdit(value as Project)
      : (value: React.SetStateAction<typeof newProject>) => setNewProject(value as typeof newProject);

    return (
        <Dialog open={isEditing || newProject.name !== "" || newProject.identifier !== ""} onOpenChange={(open) => {
            if (!open) {
                setProjectToEdit(null);
                setNewProject({ name: "", identifier: "", requiresControlGestionApproval: false, requiresJefeDeObraApproval: false });
            }
        }}>
            <DialogTrigger asChild>
                <Button onClick={handleOpenAddDialog}>Agregar Proyecto</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar Proyecto' : 'Agregar Nuevo Proyecto'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Modifique los detalles del proyecto y la configuración de aprobación.' : 'Complete los detalles del proyecto y configure su flujo de aprobación.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="project-identifier">Identificador</Label>
                        <Input
                            id="project-identifier"
                            placeholder="Ej. PC01"
                            value={projectData.identifier}
                            onChange={(e) => setProjectData(p => ({ ...p!, identifier: e.target.value }))}
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="project-name">Nombre del Proyecto</Label>
                        <Input
                            id="project-name"
                            placeholder="Nombre del nuevo proyecto"
                            value={projectData.name}
                            onChange={(e) => setProjectData(p => ({ ...p!, name: e.target.value }))}
                            disabled={isPending}
                        />
                    </div>
                    <Separator />
                     <div className="space-y-4">
                        <h4 className="font-medium text-sm">Flujo de Aprobación de Partes</h4>
                         <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <Label htmlFor="control-gestion-approval">Aprobación por Control y Gestión</Label>
                                <p className="text-xs text-muted-foreground">
                                    Habilitar el paso de aprobación por Control y Gestión.
                                </p>
                            </div>
                            <Switch
                                id="control-gestion-approval"
                                checked={projectData.requiresControlGestionApproval}
                                onCheckedChange={(checked) => setProjectData(p => ({ ...p!, requiresControlGestionApproval: checked }))}
                                disabled={isPending}
                            />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <Label htmlFor="jefe-obra-approval">Aprobación por Jefe de Obra</Label>
                                <p className="text-xs text-muted-foreground">
                                   Habilitar el paso de aprobación por Jefe de Obra / PM.
                                </p>
                            </div>
                            <Switch
                                id="jefe-obra-approval"
                                checked={projectData.requiresJefeDeObraApproval}
                                onCheckedChange={(checked) => setProjectData(p => ({ ...p!, requiresJefeDeObraApproval: checked }))}
                                disabled={isPending}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" disabled={isPending}>Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleSaveProject} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditing ? 'Guardar Cambios' : 'Agregar Proyecto'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
                <CardTitle>Lista de Proyectos</CardTitle>
                <CardDescription>
                    Aquí puede ver todos los proyectos existentes, agregar nuevos o eliminarlos.
                </CardDescription>
            </div>
            {renderEditDialog()}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 rounded-md border">
            <div className="p-4">
              {allProjects.length > 0 ? (
                <ul className="space-y-2">
                  {allProjects.map((project) => (
                    <li key={project.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                      <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="font-mono">{project.identifier.toUpperCase()}</Badge>
                          <p className="font-medium">{project.name}</p>
                      </div>
                       <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2" title="Aprobación Control y Gestión">
                             {project.requiresControlGestionApproval ? <Check className="h-5 w-5 text-green-600" /> : <X className="h-5 w-5 text-destructive" />}
                             <span className="text-xs text-muted-foreground hidden sm:inline">C&G</span>
                          </div>
                          <div className="flex items-center gap-2" title="Aprobación Jefe de Obra">
                             {project.requiresJefeDeObraApproval ? <Check className="h-5 w-5 text-green-600" /> : <X className="h-5 w-5 text-destructive" />}
                              <span className="text-xs text-muted-foreground hidden sm:inline">PM</span>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(project)}>Editar</Button>
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
                       </div>
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
