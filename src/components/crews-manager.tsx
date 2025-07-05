
"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
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
import { Combobox } from "@/components/ui/combobox";
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
import { Loader2, PlusCircle, Trash2, Pencil, Plus, X, Search } from "lucide-react";
import type { Crew, Obra, Employee } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addCrew, deleteCrew, updateCrew } from "@/app/actions";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";

interface CrewsManagerProps {
  initialCrews: Crew[];
  initialObras: Obra[];
  initialEmployees: Employee[];
}

const emptyForm = {
    name: "",
    obraId: "",
    capatazId: "",
    apuntadorId: "",
    jefeDeObraId: "",
    controlGestionId: "",
    employeeIds: [] as string[],
};

export default function CrewsManager({ initialCrews, initialObras, initialEmployees }: CrewsManagerProps) {
  const t = useTranslations('CrewsManager');
  const { toast } = useToast();
  const [allCrews, setAllCrews] = useState<Crew[]>(initialCrews);
  const [isCrewDialogOpen, setIsCrewDialogOpen] = useState(false);
  const [crewToDelete, setCrewToDelete] = useState<Crew | null>(null);
  const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
  const [selectedObraId, setSelectedObraId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [newCrewState, setNewCrewState] = useState(emptyForm);
  const [personnelSearchTerm, setPersonnelSearchTerm] = useState("");
  
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isCrewDialogOpen) {
      if (editingCrew) {
        setNewCrewState({ ...editingCrew, employeeIds: editingCrew.employeeIds || [] });
      } else {
        const initialObraId = selectedObraId !== 'all' ? selectedObraId : "";
        setNewCrewState({...emptyForm, obraId: initialObraId});
      }
    } else {
      setPersonnelSearchTerm(""); // Reset on close
    }
  }, [editingCrew, isCrewDialogOpen, selectedObraId]);

  const employeeNameMap = useMemo(() => {
    return Object.fromEntries(initialEmployees.map(emp => [emp.id, `${emp.nombre} ${emp.apellido}`]));
  }, [initialEmployees]);

  const employeeOptions = useMemo(() => {
    return initialEmployees.map(emp => ({
        value: emp.id,
        label: `${emp.nombre} ${emp.apellido} (L: ${emp.legajo}${emp.cuil ? `, C: ${emp.cuil}` : ''})`
    }));
  }, [initialEmployees]);

  const jornalEmployees = useMemo(() => {
    return initialEmployees.filter(emp => emp.condicion === 'jornal' && emp.estado === 'activo');
  }, [initialEmployees]);

  const availablePersonnel = useMemo(() => {
    const lowerCaseSearch = personnelSearchTerm.toLowerCase().trim();
    if (!lowerCaseSearch) {
        return [];
    }
    return jornalEmployees
        .filter(emp => {
            const isNotAssigned = !newCrewState.employeeIds.includes(emp.id);
            if (!isNotAssigned) return false;

            const fullName = `${emp.nombre} ${emp.apellido}`.toLowerCase();
            const legajo = emp.legajo;
            
            return fullName.includes(lowerCaseSearch) || 
                   legajo.includes(lowerCaseSearch) ||
                   (emp.cuil && emp.cuil.includes(lowerCaseSearch));
        });
  }, [jornalEmployees, newCrewState.employeeIds, personnelSearchTerm]);

  const assignedPersonnel = useMemo(() => {
    return jornalEmployees.filter(emp => newCrewState.employeeIds.includes(emp.id));
  }, [jornalEmployees, newCrewState.employeeIds]);

  const filteredCrews = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();

    let crews = allCrews;
    if (selectedObraId !== "all") {
        crews = crews.filter(crew => crew.obraId === selectedObraId);
    }
    
    if (!lowerCaseSearchTerm) {
        return crews;
    }

    return crews.filter((crew) =>
        crew.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        (employeeNameMap[crew.capatazId] || '').toLowerCase().includes(lowerCaseSearchTerm) ||
        (employeeNameMap[crew.apuntadorId] || '').toLowerCase().includes(lowerCaseSearchTerm) ||
        (employeeNameMap[crew.jefeDeObraId] || '').toLowerCase().includes(lowerCaseSearchTerm) ||
        (employeeNameMap[crew.controlGestionId] || '').toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [allCrews, selectedObraId, searchTerm, employeeNameMap]);
  
  const handleInputChange = (field: keyof typeof emptyForm, value: string | string[]) => {
    setNewCrewState(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveCrew = () => {
    const { name, obraId, capatazId, apuntadorId, jefeDeObraId, controlGestionId } = newCrewState;
    if (!name.trim() || !obraId || !capatazId || !apuntadorId || !jefeDeObraId || !controlGestionId) {
      toast({
        title: t('toast.validationErrorTitle'),
        description: t('toast.validationErrorDescription'),
        variant: "destructive",
      });
      return;
    }
    startTransition(async () => {
      try {
        if (editingCrew) {
          const updatedCrew = await updateCrew(editingCrew.id, newCrewState);
          setAllCrews(prev => prev.map(c => c.id === updatedCrew.id ? updatedCrew : c));
          toast({
            title: t('toast.crewUpdatedTitle'),
            description: t('toast.crewUpdatedDescription', { crewName: updatedCrew.name }),
          });
        } else {
          const newCrew = await addCrew(newCrewState);
          setAllCrews((prev) => [...prev, newCrew]);
          toast({
            title: t('toast.crewAddedTitle'),
            description: t('toast.crewAddedDescription', { crewName: newCrew.name }),
          });
        }
        setIsCrewDialogOpen(false);
        setEditingCrew(null);
      } catch (error) {
        toast({
          title: t('toast.error'),
          description: error instanceof Error ? error.message : t('toast.saveErrorDescription'),
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
          title: t('toast.crewDeletedTitle'),
          description: t('toast.crewDeletedDescription', { crewName: crewToDelete.name }),
        });
      } catch (error) {
        toast({
          title: t('toast.deleteErrorTitle'),
          description: error instanceof Error ? error.message : t('toast.unexpectedError'),
          variant: "destructive",
        });
      } finally {
        setCrewToDelete(null);
      }
    });
  };

  const handleOpenAddDialog = () => {
    setEditingCrew(null);
    setIsCrewDialogOpen(true);
  }

  const handleOpenEditDialog = (crew: Crew) => {
    setEditingCrew(crew);
    setIsCrewDialogOpen(true);
  }

  return (
    <>
      <Card>
        <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <CardTitle>{t('cardTitle')}</CardTitle>
                    <CardDescription>
                        {t('cardDescription')}
                    </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full sm:w-[200px]"
                        />
                    </div>
                    <Select onValueChange={setSelectedObraId} defaultValue="all">
                        <SelectTrigger className="w-full sm:w-[250px]">
                            <SelectValue placeholder={t('filterByProjectPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('allProjects')}</SelectItem>
                            {initialObras.map((obra) => (
                                <SelectItem key={obra.id} value={obra.id}>
                                    {obra.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleOpenAddDialog}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('addCrewButton')}
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('tableHeaderName')}</TableHead>
                            <TableHead>{t('tableHeaderForeman')}</TableHead>
                            <TableHead>{t('tableHeaderTallyman')}</TableHead>
                            <TableHead>{t('tableHeaderSiteManager')}</TableHead>
                            <TableHead>{t('tableHeaderMgmtControl')}</TableHead>
                            <TableHead className="text-center">{t('tableHeaderPersonnel')}</TableHead>
                            <TableHead className="text-right w-[120px]">{t('tableHeaderActions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCrews.length > 0 ? (
                            filteredCrews.map((crew) => (
                                <TableRow key={crew.id}>
                                    <TableCell className="font-medium">{crew.name}</TableCell>
                                    <TableCell>{employeeNameMap[crew.capatazId] || 'N/A'}</TableCell>
                                    <TableCell>{employeeNameMap[crew.apuntadorId] || 'N/A'}</TableCell>
                                    <TableCell>{employeeNameMap[crew.jefeDeObraId] || 'N/A'}</TableCell>
                                    <TableCell>{employeeNameMap[crew.controlGestionId] || 'N/A'}</TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant="secondary">{crew.employeeIds?.length || 0}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                         <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleOpenEditDialog(crew)}
                                            disabled={isPending}
                                        >
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">{t('editSr', { name: crew.name })}</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={() => setCrewToDelete(crew)}
                                            disabled={isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">{t('deleteSr', { name: crew.name })}</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    {allCrews.length === 0 
                                        ? t('noCrewsCreated') 
                                        : t('noCrewsWithFilter')
                                    }
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      
      <Dialog open={isCrewDialogOpen} onOpenChange={(open) => { setIsCrewDialogOpen(open); if (!open) setEditingCrew(null); }}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingCrew ? t('editCrewDialogTitle') : t('addCrewDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('addCrewDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="crew-name">{t('nameLabel')}</Label>
                <Input id="crew-name" value={newCrewState.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder={t('namePlaceholder')} disabled={isPending}/>
              </div>
              <div>
                <Label htmlFor="crew-obra">{t('projectLabel')}</Label>
                 <Select onValueChange={(value) => handleInputChange('obraId', value)} value={newCrewState.obraId} disabled={isPending}>
                  <SelectTrigger><SelectValue placeholder={t('selectProjectPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    {initialObras.map((obra) => <SelectItem key={obra.id} value={obra.id}>{obra.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="crew-capataz">{t('foremanLabel')}</Label>
                 <Combobox
                    options={employeeOptions}
                    value={newCrewState.capatazId}
                    onValueChange={(value) => handleInputChange('capatazId', value)}
                    placeholder={t('selectEmployeePlaceholder')}
                    searchPlaceholder={t('searchEmployeePlaceholder')}
                    emptyMessage={t('employeeNotFound')}
                    disabled={isPending}
                  />
              </div>
              <div>
                <Label htmlFor="crew-apuntador">{t('tallymanLabel')}</Label>
                 <Combobox
                    options={employeeOptions}
                    value={newCrewState.apuntadorId}
                    onValueChange={(value) => handleInputChange('apuntadorId', value)}
                    placeholder={t('selectEmployeePlaceholder')}
                    searchPlaceholder={t('searchEmployeePlaceholder')}
                    emptyMessage={t('employeeNotFound')}
                    disabled={isPending}
                  />
              </div>
              <div>
                <Label htmlFor="crew-jefe">{t('siteManagerLabel')}</Label>
                 <Combobox
                    options={employeeOptions}
                    value={newCrewState.jefeDeObraId}
                    onValueChange={(value) => handleInputChange('jefeDeObraId', value)}
                    placeholder={t('selectEmployeePlaceholder')}
                    searchPlaceholder={t('searchEmployeePlaceholder')}
                    emptyMessage={t('employeeNotFound')}
                    disabled={isPending}
                  />
              </div>
               <div>
                <Label htmlFor="crew-control" className="whitespace-nowrap">{t('mgmtControlLabel')}</Label>
                 <Combobox
                    options={employeeOptions}
                    value={newCrewState.controlGestionId}
                    onValueChange={(value) => handleInputChange('controlGestionId', value)}
                    placeholder={t('selectEmployeePlaceholder')}
                    searchPlaceholder={t('searchEmployeePlaceholder')}
                    emptyMessage={t('employeeNotFound')}
                    disabled={isPending}
                  />
              </div>
            </div>
            <Separator className="my-4" />
             <div>
                <h3 className="mb-4 text-lg font-medium leading-none">{t('assignPersonnelTitle')} <Badge variant="outline">{t('activeDailyWorkerBadge')}</Badge></h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-72">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-sm">{t('availablePersonnelTitle')}</h4>
                            {personnelSearchTerm && <Badge variant="secondary">{t('foundCount', { count: availablePersonnel.length })}</Badge>}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="personnel-search"
                                placeholder={t('searchPersonnelPlaceholder')}
                                value={personnelSearchTerm}
                                onChange={(e) => setPersonnelSearchTerm(e.target.value)}
                                className="pl-10 h-9"
                                disabled={isPending}
                            />
                        </div>
                        <ScrollArea className="flex-1 rounded-md border p-2">
                            {availablePersonnel.length > 0 ? availablePersonnel.map(emp => (
                                <div key={emp.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                    <div>
                                        <p className="font-medium">{employeeNameMap[emp.id]}</p>
                                        <p className="text-xs text-muted-foreground">L: {emp.legajo}</p>
                                    </div>
                                    <Button size="icon" variant="outline" onClick={() => handleInputChange('employeeIds', [...newCrewState.employeeIds, emp.id])} disabled={isPending}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            )) : (
                                <div className="text-center text-sm text-muted-foreground py-4">
                                    {personnelSearchTerm ? t('noPersonnelFound') : t('typeToSearchPersonnel')}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                    <div className="flex flex-col gap-2">
                        <h4 className="font-semibold text-sm">{t('assignedPersonnelTitle', { count: assignedPersonnel.length })}</h4>
                        <div className="h-9" /> {/* Spacer to align */}
                        <ScrollArea className="flex-1 rounded-md border p-2">
                             {assignedPersonnel.length > 0 ? assignedPersonnel.map(emp => (
                                   <div key={emp.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                    <div>
                                        <p className="font-medium">{employeeNameMap[emp.id]}</p>
                                        <p className="text-xs text-muted-foreground">L: {emp.legajo}</p>
                                    </div>
                                    <Button size="icon" variant="destructive" onClick={() => handleInputChange('employeeIds', newCrewState.employeeIds.filter(id => id !== emp.id))} disabled={isPending}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )) : (
                                <div className="text-center text-sm text-muted-foreground py-4">
                                    {t('noPersonnelAssigned')}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>{t('cancelButton')}</Button></DialogClose>
            <Button type="submit" onClick={handleSaveCrew} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('saveButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!crewToDelete} onOpenChange={(open) => !open && setCrewToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteDialogTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('deleteDialogDescription', { crewName: crewToDelete?.name })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setCrewToDelete(null)} disabled={isPending}>
                    {t('cancelButton')}
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteCrew} 
                  disabled={isPending}
                  className={buttonVariants({ variant: "destructive" })}
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('deleteDialogConfirmButton')}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
