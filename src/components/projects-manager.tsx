
"use client";

import { useState, useTransition, useEffect } from "react";
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
import { Loader2, Trash2, Check, X, Pencil, PlusCircle } from "lucide-react";
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
import type { Project, SpecialHourType, UnproductiveHourType, AbsenceType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { collection, addDoc, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Switch } from "./ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "./ui/dialog";
import { Separator } from "./ui/separator";
import { MultiSelectCombobox, type ComboboxOption } from "./ui/multi-select-combobox";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProjectsManagerProps {
  initialProjects: Project[];
}

const emptyProject = { 
    name: "", 
    identifier: "", 
    requiresControlGestionApproval: false, 
    requiresJefeDeObraApproval: false,
    specialHourTypeIds: [],
    unproductiveHourTypeIds: [],
    absenceTypeIds: [],
};

export default function ProjectsManager({ initialProjects }: ProjectsManagerProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [allProjects, setAllProjects] = useState<Project[]>(initialProjects.sort((a, b) => a.name.localeCompare(b.name)));
  
  const [allSpecialHourTypes, setAllSpecialHourTypes] = useState<SpecialHourType[]>([]);
  const [allUnproductiveHourTypes, setAllUnproductiveHourTypes] = useState<UnproductiveHourType[]>([]);
  const [allAbsenceTypes, setAllAbsenceTypes] = useState<AbsenceType[]>([]);
  
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function fetchHourTypes() {
        try {
            const [specialSnapshot, unproductiveSnapshot, absenceSnapshot] = await Promise.all([
                getDocs(collection(db, 'special-hour-types')),
                getDocs(collection(db, 'unproductive-hour-types')),
                getDocs(collection(db, 'absence-types')),
            ]);
            setAllSpecialHourTypes(specialSnapshot.docs.map(d => ({id: d.id, ...d.data()})) as SpecialHourType[]);
            setAllUnproductiveHourTypes(unproductiveSnapshot.docs.map(d => ({id: d.id, ...d.data()})) as UnproductiveHourType[]);
            setAllAbsenceTypes(absenceSnapshot.docs.map(d => ({id: d.id, ...d.data()})) as AbsenceType[]);
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudieron cargar los tipos de horas o ausencias.",
                variant: "destructive",
            });
        }
    }
    fetchHourTypes();
  }, [toast]);

  const specialHourTypeOptions: ComboboxOption[] = allSpecialHourTypes.map(t => ({ value: t.id, label: `${t.name} (${t.code})`}));
  const unproductiveHourTypeOptions: ComboboxOption[] = allUnproductiveHourTypes.map(t => ({ value: t.id, label: `${t.name} (${t.code})`}));
  const absenceTypeOptions: ComboboxOption[] = allAbsenceTypes.map(t => ({ value: t.id, label: `${t.name} (${t.code})`}));

  const handleOpenEditDialog = (project: Project) => {
    setProjectToEdit({
      ...emptyProject,
      ...project,
      requiresControlGestionApproval: project.requiresControlGestionApproval ?? false,
      requiresJefeDeObraApproval: project.requiresJefeDeObraApproval ?? false,
      specialHourTypeIds: project.specialHourTypeIds || [],
      unproductiveHourTypeIds: project.unproductiveHourTypeIds || [],
      absenceTypeIds: project.absenceTypeIds || [],
    });
  };

  const handleSaveProject = () => {
    if (!projectToEdit || !projectToEdit.name.trim() || !projectToEdit.identifier.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre y el identificador del proyecto no pueden estar vacíos.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      try {
        if (projectToEdit.id) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...dataToUpdate } = projectToEdit;
            const docRef = doc(db, 'projects', projectToEdit.id);
            await updateDoc(docRef, dataToUpdate);
            const updatedProject = { ...projectToEdit } as Project;
            setAllProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p).sort((a, b) => a.name.localeCompare(b.name)));
            toast({ title: "Proyecto actualizado", description: `El proyecto "${updatedProject.name}" ha sido actualizado.` });
        } else {
            const projectsRef = collection(db, 'projects');
            const q = query(projectsRef, where("identifier", "==", projectToEdit.identifier.toUpperCase()));
            const existing = await getDocs(q);
            if (!existing.empty) {
                throw new Error('Ya existe un proyecto con el mismo identificador.');
            }

            const dataToSave = { 
                name: projectToEdit.name, 
                identifier: projectToEdit.identifier.toUpperCase(),
                requiresControlGestionApproval: projectToEdit.requiresControlGestionApproval,
                requiresJefeDeObraApproval: projectToEdit.requiresJefeDeObraApproval,
                specialHourTypeIds: projectToEdit.specialHourTypeIds || [],
                unproductiveHourTypeIds: projectToEdit.unproductiveHourTypeIds || [],
                absenceTypeIds: projectToEdit.absenceTypeIds || [],
            };
            const docRef = await addDoc(projectsRef, dataToSave);
            const addedProject = { id: docRef.id, ...dataToSave };

            setAllProjects((prev) => [...prev, addedProject].sort((a, b) => a.name.localeCompare(b.name)));
            toast({ title: "Proyecto agregado", description: `El proyecto "${addedProject.name}" ha sido creado.` });
        }
        setProjectToEdit(null);
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

  const MobileProjectCard = ({ project }: { project: Project }) => (
    <div className="p-4 border rounded-lg space-y-3">
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="font-mono">{project.identifier.toUpperCase()}</Badge>
              <p className="font-medium truncate">{project.name}</p>
            </div>
        </div>
        <div className="flex items-center gap-4 justify-between w-full">
            <div className="flex items-center gap-2" title="Aprobación Control y Gestión">
               {project.requiresControlGestionApproval ? <Check className="h-5 w-5 text-green-600" /> : <X className="h-5 w-5 text-destructive" />}
               <span className="text-xs text-muted-foreground">C&G</span>
            </div>
            <div className="flex items-center gap-2" title="Aprobación Jefe de Obra">
               {project.requiresJefeDeObraApproval ? <Check className="h-5 w-5 text-green-600" /> : <X className="h-5 w-5 text-destructive" />}
                <span className="text-xs text-muted-foreground">PM</span>
            </div>
        </div>
        <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(project)}>
                <Pencil className="mr-2 h-4 w-4"/>
                Configurar
            </Button>
            <Button
                variant="destructive"
                size="sm"
                onClick={() => setProjectToDelete(project)}
                disabled={isPending}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    </div>
  );
  
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <CardTitle>Lista de Proyectos</CardTitle>
                <CardDescription>
                    Aquí puede ver todos los proyectos, agregar nuevos o configurar los existentes.
                </CardDescription>
            </div>
             <Button onClick={() => setProjectToEdit(emptyProject as unknown as Project)} className="w-full sm:w-auto shrink-0">
                <PlusCircle className="mr-2 h-4 w-4"/>
                Agregar Proyecto
             </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {isMobile ? (
                <div className="space-y-2 p-1">
                    {allProjects.map(project => <MobileProjectCard key={project.id} project={project} />)}
                </div>
            ) : (
                <div className="p-4">
                  {allProjects.length > 0 ? (
                    <ul className="space-y-2">
                      {allProjects.map((project) => (
                        <li key={project.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-md bg-muted/50 gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="font-mono">{project.identifier.toUpperCase()}</Badge>
                              <p className="font-medium truncate">{project.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 justify-between sm:justify-end w-full sm:w-auto">
                            <div className="flex items-center gap-2" title="Aprobación Control y Gestión">
                               {project.requiresControlGestionApproval ? <Check className="h-5 w-5 text-green-600" /> : <X className="h-5 w-5 text-destructive" />}
                               <span className="text-xs text-muted-foreground">C&G</span>
                            </div>
                            <div className="flex items-center gap-2" title="Aprobación Jefe de Obra">
                               {project.requiresJefeDeObraApproval ? <Check className="h-5 w-5 text-green-600" /> : <X className="h-5 w-5 text-destructive" />}
                                <span className="text-xs text-muted-foreground">PM</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(project)}>
                                  <Pencil className="mr-0 sm:mr-2 h-4 w-4"/>
                                  <span className="hidden sm:inline">Configurar</span>
                              </Button>
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
            )}
          </ScrollArea>
        </CardContent>
      </Card>
      
       <Dialog open={!!projectToEdit} onOpenChange={(open) => !open && setProjectToEdit(null)}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>{projectToEdit?.id ? 'Editar Proyecto' : 'Agregar Nuevo Proyecto'}</DialogTitle>
                    <DialogDescription>
                        {projectToEdit?.id ? 'Modifique los detalles del proyecto y la configuración de aprobación.' : 'Complete los detalles del proyecto y configure su flujo de aprobación.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="space-y-2">
                        <Label htmlFor="project-identifier">Identificador</Label>
                        <Input
                            id="project-identifier"
                            placeholder="Ej. PC01"
                            value={projectToEdit?.identifier || ''}
                            onChange={(e) => setProjectToEdit(p => ({ ...p!, identifier: e.target.value }))}
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="project-name">Nombre del Proyecto</Label>
                        <Input
                            id="project-name"
                            placeholder="Nombre del nuevo proyecto"
                            value={projectToEdit?.name || ''}
                            onChange={(e) => setProjectToEdit(p => ({ ...p!, name: e.target.value }))}
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
                                checked={projectToEdit?.requiresControlGestionApproval}
                                onCheckedChange={(checked) => setProjectToEdit(p => ({ ...p!, requiresControlGestionApproval: checked }))}
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
                                checked={projectToEdit?.requiresJefeDeObraApproval}
                                onCheckedChange={(checked) => setProjectToEdit(p => ({ ...p!, requiresJefeDeObraApproval: checked }))}
                                disabled={isPending}
                            />
                        </div>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                        <h4 className="font-medium text-sm">Tipos Permitidos</h4>
                        <div className="space-y-2">
                            <Label>Tipos de Ausentismo</Label>
                             <MultiSelectCombobox 
                                options={absenceTypeOptions}
                                selected={projectToEdit?.absenceTypeIds || []}
                                onChange={(value) => setProjectToEdit(p => ({ ...p!, absenceTypeIds: value }))}
                                placeholder="Seleccionar tipos de ausentismo..."
                                disabled={isPending}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tipos de Horas Especiales</Label>
                            <MultiSelectCombobox 
                                options={specialHourTypeOptions}
                                selected={projectToEdit?.specialHourTypeIds || []}
                                onChange={(value) => setProjectToEdit(p => ({ ...p!, specialHourTypeIds: value }))}
                                placeholder="Seleccionar tipos especiales..."
                                disabled={isPending}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tipos de Horas Improductivas</Label>
                             <MultiSelectCombobox 
                                options={unproductiveHourTypeOptions}
                                selected={projectToEdit?.unproductiveHourTypeIds || []}
                                onChange={(value) => setProjectToEdit(p => ({ ...p!, unproductiveHourTypeIds: value }))}
                                placeholder="Seleccionar tipos improductivos..."
                                disabled={isPending}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter className="flex-col-reverse sm:flex-row">
                    <DialogClose asChild>
                        <Button variant="outline" disabled={isPending}>Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleSaveProject} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {projectToEdit?.id ? 'Guardar Cambios' : 'Agregar Proyecto'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

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
